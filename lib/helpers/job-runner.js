
var runner = (function() {
  var through = require('through'),
    csv = require('fast-csv'),
    http = require('http'),
    mc = require('mongodb').MongoClient,
    _ = require('lodash'),
    config = require('../config/config'),
    Q = require('q'),
    fs = require('fs'),
    dataMongo = require('../controllers/data_mongo'),
    intersection = require('./intersection-finder'),
    crashData = [],
    ttl;

  var transformDate = function(date, time) {
    if(_.isString(date)) {
        var dateParts = date.split('/');
        var year = dateParts[2];
        var month = parseInt(dateParts[0], 10) - 1;
        var day = dateParts[1];

        var timeParts = time.split(':');
        var hour = timeParts[0];
        var min = timeParts[1];

        return new Date(year, month, day, hour, min);
      } else {
        return date;
      }
  };

  var isNumberKey = function(key) {
    return (key.indexOf('NUMBER') > -1 || key === "UNIQUE KEY" || key === "ZIP CODE" || key === "LATITUDE" || key === "LONGITUDE");
  };

  var isUpdated = function(oldCrash, newCrash) {
    var keys = ['time','borough','zip_code','on_street_name','cross_street_name','off_street_name','number_of_persons_injured','number_of_persons_killed','number_of_pedestrians_injured','number_of_pedestrians_killed','number_of_cyclist_injured','number_of_cyclist_killed','number_of_motorist_injured','number_of_motorist_killed','contributing_factor_vehicle_1','contributing_factor_vehicle_2','contributing_factor_vehicle_3','contributing_factor_vehicle_4','contributing_factor_vehicle_5','unique_key','vehicle_type_code_1','vehicle_type_code_2','vehicle_type_code_3','vehicle_type_code_4','vehicle_type_code_5','city_council_district','assembly_district','congressional_district','police_precinct','latitude','longitude'];
    return _.any(_.map(keys, function(key) {
      if(oldCrash[key] !== newCrash[key]) { return true; }
    }), Boolean);
  };

  var doesCrashNeedUpdating = function(crash) {
    return Q.Promise(function(resolve, reject) {
      resolve(true);
      // var mongoConnection = mongoConnection || config.mongo;
      // mc.connect(mongoConnection, function(err, conn) {
      //   if (err) {console.log('error connecting to mongodb (doesCrashNeedUpdating)\n', err); reject(err); return; }
      //   var crashCol = conn.collection('crashes');
      //   return crashCol.findOne({'unique_key': crash.unique_key}, {}, function(err, item) {
      //     conn.close();
      //     if(item) {
      //       console.log('item:', item.unique_key, crash.unique_key);
      //       resolve(isUpdated(item, crash));
      //     }
      //     resolve(true); //not found.
      //   });
      // });
    });
  };

  var crashWrite = function(buffer, next) {
    var tBuffer = {};
    var re = / /g;

    _.forOwn(buffer, function(val, key) {
      if (isNumberKey(key)) {
        tBuffer[key.toLowerCase().replace(re, '_')] = Number(val);
      } else {
        tBuffer[key.toLowerCase().replace(re, '_')] = val;
      }
    });

    tBuffer.date = transformDate(buffer.DATE, buffer.TIME);
    intersection.getLocation(tBuffer).then(function(locationInfo) {
      if (locationInfo.valid) {
        //check if crash exists and if all data is the same.
        //if so dont update.
        tBuffer.location = locationInfo.location;
        delete tBuffer.location.save;
        delete tBuffer.latitude;
        delete tBuffer.longitude;
        tBuffer.city_council_district = locationInfo.cityCouncilDistrict;
        tBuffer.assembly_district = locationInfo.assemblyDistrict;
        tBuffer.congressional_district = locationInfo.congressionalDistrict;
        tBuffer.police_precinct = locationInfo.policePrecinct;
        tBuffer.latitude = locationInfo.location.latitude;
        tBuffer.longitude = locationInfo.location.longitude;
        tBuffer.loc = { type: 'Point', coordinates: [locationInfo.location.longitude, locationInfo.location.latitude] };
      }  else {
        tBuffer.location = false;
      }
      //ttl.calcTotals(tBuffer);

      if(locationInfo.save) { intersection.saveLocation(locationInfo); }

      if(!tBuffer) { next(null,false); }

      return doesCrashNeedUpdating(tBuffer).then(function(result) {
        // console.log('result:', result);
        if (result === true) {
          // saveCrash(tBuffer);
          next(null, tBuffer);
          // next(null, false);
        } else {
          next(null, false);
        }
      })
      .catch(function(err) {
        console.log('Error: ' + err);
        next(null, false);
      });
    }).catch(function(err) {
      console.log('Error: ' + err);
    });

    buffer = null;
  };

  var getFileContents = function(path) {
    console.log('processing file:', path);
    var crashCount = 0;
    var crashes = [];
    var headers = ['DATE','TIME','BOROUGH','ZIP CODE','LATITUDE','LONGITUDE','LOCATION','ON STREET NAME','CROSS STREET NAME','OFF STREET NAME','NUMBER OF PERSONS INJURED','NUMBER OF PERSONS KILLED','NUMBER OF PEDESTRIANS INJURED','NUMBER OF PEDESTRIANS KILLED','NUMBER OF CYCLIST INJURED','NUMBER OF CYCLIST KILLED','NUMBER OF MOTORIST INJURED','NUMBER OF MOTORIST KILLED','CONTRIBUTING FACTOR VEHICLE 1','CONTRIBUTING FACTOR VEHICLE 2','CONTRIBUTING FACTOR VEHICLE 3','CONTRIBUTING FACTOR VEHICLE 4','CONTRIBUTING FACTOR VEHICLE 5','UNIQUE KEY','VEHICLE TYPE CODE 1','VEHICLE TYPE CODE 2','VEHICLE TYPE CODE 3','VEHICLE TYPE CODE 4','VEHICLE TYPE CODE 5'];
    return Q.Promise(function(resolve, reject) {

      csv.fromPath(path, {'objectMode': true, 'headers': headers})
      .transform(function(data, next) {
        crashWrite(data, next);
      })
      .on('error', function(err) {
        console.log(err);
      })
      .on('data', function(crash) {
        crashes.push(crash);
        // //console.log('crashCount:', crashCount);
        //
        // if(crashCount % 1000 === 0) {
        //   var d = new Date();
        //   var start = Date.now();
        //   console.log('bulkCrashSave:', d, crashCount);
        //   batch.execute();
        //   console.log('execute:', (Date.now() - start));
        //   crashCount = 0;
        //   batch = crashCol.initializeUnorderedBulkOp({w: 1});
        //   console.log('new batch:', (Date.now() - start));
        // }
      })
      .on('end', function() {
        resolve(crashes);
      });
    });
  };

  var saveCrashes = function(crashes) {
    return Q.Promise(function(resolve, reject) {
      var mongoConnection = mongoConnection || config.mongo;
      mc.connect(mongoConnection, function(err, conn) {

        if (err) {console.log('error connecting to mongodb (saveCrashes)\n', err); reject(err); }
        var crashCol = conn.collection('crashes');
        var batch = crashCol.initializeUnorderedBulkOp({w: 1});
        crashes.filter(function (crash) { return crash; }).forEach(function(crash) {
          batch.find({'unique_key': crash.unique_key}).upsert().update({$set: crash});
        });
        var start = Date.now();
        batch.execute(function(err, result) {
          console.log('batch complete:' + ((Date.now() - start)/1000) +'secs');
          if(err) { reject(err); }
          conn.close();
          resolve(true);
        });
      });
    });
  };

  var saveCrash = function(crash) {
    return Q.Promise(function(resolve, reject) {
      var mongoConnection = mongoConnection || config.mongo;
      mc.connect(mongoConnection, function(err, conn) {
        if (err) {console.log('error connecting to mongodb (saveCrash)\n', err); reject(err); }
        var crashCol = conn.collection('crashes');
        var start = Date.now();
        crashCol.updateOne({'unique_key': crash.unique_key}, {$set: crash}, {upsert: true}, function(err, result) {
          console.log('upsert complete:' + ((Date.now() - start)/1000) +'secs');
          conn.close();
          if(err) { reject(err); }
          resolve(true);
        });
      });
    });
  };

  var job = function() {
      var filename = './splitfiles/' + process.argv[2];
      var start = Date.now();
      if(!filename) { return; }
      return getFileContents(filename).then(function(crashes) {
        var unlink = function () {
          fs.unlink(filename, function() {
            console.log('Total processing time: ' + ((Date.now() - start)/1000) + 'secs');
            process.exit(0);
          });
        };

        console.log('crashes in file: ' + crashes.length + ' - ' + ((Date.now() - start)/1000) + 'secs');
        if(crashes.length === 0) {
          unlink();
        } else {
          saveCrashes(crashes).then(function() {
              unlink();
          }).catch(function(err) {
            if(err) { console.log('ERROR:' + err); }
              process.exit(0);
          });
        }
      });
  };

  return {
    job:job
  };
}());

runner.job(process.argv[2]);
