'use strict';

var through = require('through'),
  csv = require('fast-csv'),
  http = require('http'),
  mc = require('mongodb').MongoClient,
  _ = require('lodash'),
  config = require('../config/config'),
  Q = require('q'),
  fs = require('fs'),
  readline = require('readline'),
  stream = require('stream'),
  Totaler = require('../helpers/totaler'),
  geotag = require('../helpers/geotag'),
  dataMongo = require('./data_mongo'),
  exec = require('child_process').exec,
  countToSave = 1,
  crashData = [],
  ttl;

  var filePath = './splitfiles/crashData.csv';

var getCrashes = function() {
  var def = Q.defer();

  console.log('fetching crashes');
  http.get('http://data.cityofnewyork.us/api/views/h9gi-nx95/rows.csv?accessType=DOWNLOAD', function(response) {

    response.on('error', function(err) { console.log('error downloading file:', new Date(), err); process.exit(1); });

    var fileData = '';
    response.on('data', function(chunk) {
      fileData += chunk;
    });

    response.on('end', function() {
      console.log('received crashes:', fileData.length);

      def.resolve(fileData);
    });
  });
  return def.promise;
};

var fetchedCrashes = function(crashData) {
  console.log('saving crashes', crashData.length);
  fs.writeFileSync(filePath, crashData);
  crashData = null;
  return filePath;
};

var splitFile = function(path) {
  var i = path.lastIndexOf('/');
  var filename = path.slice(i+1);
  var dir = path.slice(0,i);
  console.log(dir, filename);
  return Q.Promise(function(resolve, reject) {
    var child = exec('split -l 2000 ' + filename + ' c_',
      {cwd: dir},
      function(error, stdout, stderr) {
        if(error) { reject(error); }
        resolve(dir);
      });
  });
};

var getFiles = function(path) {
  return fs.readdirSync(path).filter(function(filename) {
    return filename.indexOf('.csv') === -1;
  });
};

var processFiles = function(files) {
  console.log('processing ' + files.length + ' files.');
  var count = files.length;
  return Q.Promise(function (resolve, reject) {
    var runJob = function(file) {
      var d = Date.now();
      console.log('starting: ' + file);
      var child = exec('node ./lib/helpers/job-runner.js ' + file, function(error, stdout, stderr) {
        console.log('finished: ' + file + ' - ' + ((Date.now() - d)/1000) + 'secs');
        // console.log(stdout);
        if(error) { console.log('error:' + error); reject(error); }
        if(files.length > 0) {
          runJob(files.pop());
        } else {
          resolve(stdout);
        }
      });
    };

    runJob(files.pop());
  });
};

//ensure indexes are created.
var eIndex = function(collection) {
  return Q.Promise(function(resolve, reject) {

    var mongoConnection = mongoConnection || config.mongo;
    mc.connect(mongoConnection, function(err, conn) {
      if (err) {console.log('error connecting to mongodb\n', err); reject(err); return false; }
      var cb = function(err, result) {
        if (err) {console.log('error: ', err); reject(err); return false; }
        // conn.close();
        resolve(true);
      };
      if(!err) {
        switch(collection) {
          case 'intersections':
            conn.ensureIndex('intersections', {'key': 1}, {}, cb);
            break;
          case 'unique_key':
            conn.ensureIndex('crashes', {'unique_key': 1}, {}, cb);
            break;
          case 'date':
            conn.ensureIndex('crashes', {'date': 1}, {}, cb);
            break;
          case 'time':
            conn.ensureIndex('crashes', {'time': 1}, {}, cb);
            break;
          case 'borough':
            conn.ensureIndex('crashes', {'borough': 1}, {}, cb);
            break;
          case 'zip_code':
            conn.ensureIndex('crashes', {'zip_code': 1}, {}, cb);
            break;
          case 'city_council_district':
            conn.ensureIndex('crashes', {'city_council_district': 1}, {}, cb);
            break;
          case 'assembly_district':
            conn.ensureIndex('crashes', {'assembly_district': 1}, {}, cb);
            break;
          case 'congressional_district':
            conn.ensureIndex('crashes', {'congressional_district': 1}, {}, cb);
            break;
          case 'police_precinct':
            conn.ensureIndex('crashes', {'police_precinct': 1}, {}, cb);
            break;
          case 'community':
            conn.ensureIndex('crashes', {'community': 1}, {}, cb);
            break;
          case 'neighborhood':
            conn.ensureIndex('crashes', {'neighborhood': 1}, {}, cb);
            break;
        }
      }
    });
  });
};

var setupCollection = function() {
  //ensure indexes on locations and crashes.
  var collections = ['intersections', 'unique_key', 'date', 'time', 'borough', 'zip_code', 'city_council_district', 'assembly_district', 'congressional_district', 'police_precinct', 'community', 'neighborhood'];
  return Q.all(_.map(collections, function(c) {
    return eIndex(c);
  }));
};

var totalCrashes = function() {
  console.log("start crash totals.");
  return Q.promise(function(resolve, reject) {
    ttl = new Totaler();
    var mongoConnection = mongoConnection || config.mongo;
    mc.connect(mongoConnection, function(err, conn) {
      if (err) {console.log('error connecting to mongodb\n', err); deferred.reject(err); process.exit(-1); return false; }
      if(!err) {
        var collection = conn.collection('crashes');
        var stream = collection.find({}, {}).stream();
        var start = Date.now();
        stream.on('data', function(item) {
          ttl.calcTotals(item);
        });

        stream.on('end', function() {
          console.log('finished totals: ' + ((Date.now() - start)/1000) + 'secs');
          // console.log('totals: ', ttl.totals);
          // resolve(true); return;
          conn.createCollection('totals', {}, function(err, res) {
            var coll = conn.collection('totals');
            coll.drop(function(err, result) {
              if(err) { reject(err); return; }
              coll = conn.collection('totals');
              var batch = coll.initializeUnorderedBulkOp({w: 1});
              ttl.totals.forEach(function(total) {
                batch.insert({
                  id:total.id,
                  type:total.type,
                  totals:total.totals
                });
              });

              var bstart = Date.now();
              batch.execute(function(err, result) {
                console.log('batch complete:' + ((Date.now() - bstart)/1000) +'secs');
                if(err) { reject(err); }
                conn.close();
                resolve(true);
              });
            });
          });
        });
      }
    });
  });
};

var refreshCrashes = function(mongoConnection) {
  // return setupCollection().then(geotag.geoIntersectFiles).then(totalCrashes);
  return setupCollection().then(getCrashes).then(function(result) {
    var path = fetchedCrashes(result);
    result = null;
    return splitFile(path);
  })
  .then(getFiles)
  .then(processFiles)
  .then(geotag.geoIntersectFiles)
  .then(totalCrashes)
  .finally(function () {
    fs.unlink(filePath, function() {
      console.log('deleted:' + filePath);
    });
  })
  .catch(function(e) { console.log('ERROR:' + e); });
};



module.exports = {
  refreshCrashes:refreshCrashes
};
