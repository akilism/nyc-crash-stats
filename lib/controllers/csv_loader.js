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
  // $ = require('highland'),
  gc = require('../helpers/nyc-geoclient'),
  Totaler = require('../helpers/totaler'),
  dataMongo = require('./data_mongo'),
  countToSave = 1,
  locations = {},
  crashData = [],
  ttl,
  db;

gc.setApi('7e66478437762cefc8a569314c6af580','0de4b98b');

var transformDate = function (date, time) {
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

var fetchIntersection = function (collectionName, query, options) {
  var deferred = Q.defer();
  var collection = db.collection(collectionName);
  var stream = collection.find(query, options).stream();
  var intersection;

  stream.on('data', function (item) {
    // console.log('data', item);
    intersection = item;
  });

  stream.on('end', function () {
    // db.close();
    // console.log(query, options, intersection || 'no match');
    deferred.resolve(intersection);
  });

  return deferred.promise;
};

var getMongoLoctation = function(key) {
  var query = {'key': key};
  return fetchIntersection('intersections', query, {});
};

var getBorough = function (borough) {
  switch (borough.toLowerCase()) {
    case 'brooklyn':
      return gc.BOROUGH.BROOKLYN;
    case 'bronx':
      return gc.BOROUGH.BRONX;
    case 'manhattan':
      return gc.BOROUGH.MANHATTAN;
    case 'queens':
      return gc.BOROUGH.QUEENS;
    case 'staten island':
      return gc.BOROUGH.STATEN_ISLAND;
  }
};

var extractKey = function(strKey) {
  //'145_ROAD%220_STREET%QUEENS%11018'
  var re = /_/g;
  var splitKey = strKey.replace(re, ' ').split('%');
  return {
    on_street_name: splitKey[0],
    cross_street_name: splitKey[1],
    borough: splitKey[2],
    zip_code: splitKey[3]
  };
};

// Connects to NYC Geoclient API to do intersection look up.
var lookupLocation = function (key) {
  var location = extractKey(key);

  if(!location.on_street_name || !location.zip_code || location.zip_code === '0') {
    return Q({
      valid: false
    });
  }

  var deferred = Q.defer();
  var borough = getBorough(location.borough);

  gc.intersection(location.on_street_name, location.cross_street_name, borough, location.zip_code, null, gc.RESPONSE_TYPE.json,
    function (err, resp) {
      // console.log(location.on_street_name, location.cross_street_name, location.borough, location.zip_code);
      // console.log('resp', resp);
      var resultLocation = {};
      resultLocation.valid = false;
      if(resp) {
        var geoclientResponse = JSON.parse(resp).intersection;

        resultLocation.key = key;

        if(geoclientResponse.latitude && geoclientResponse.longitude) {
          resultLocation.location = {
            latitude: geoclientResponse.latitude,
            longitude: geoclientResponse.longitude
          };
          resultLocation.cityCouncilDistrict = geoclientResponse.cityCouncilDistrict;
          resultLocation.assemblyDistrict = geoclientResponse.assemblyDistrict;
          resultLocation.congressionalDistrict = geoclientResponse.congressionalDistrict;
          resultLocation.policePrecinct = geoclientResponse.policePrecinct;
          resultLocation.valid = true;
        }
      }
      deferred.resolve(resultLocation);
  });

  return deferred.promise;
};

var getKey = function(buffer) {
  var data = [buffer.on_street_name, buffer.cross_street_name, buffer.borough, buffer.zip_code];
  var re = / /g;
  return data.join('%').replace(re, '_');
};

var getLocation = function(buffer) {
  var key = getKey(buffer);

  var extractedKey = extractKey(key);

  if (extractedKey.zip_code === '0' || !extractedKey.cross_street_name) { return Q({ valid: false }); }

  if(locations[key]) {
    // console.log('local lookup:', key);
    return Q(locations[key]);
  }

  return getMongoLoctation(key).then(function (result) {
    if(result && result.location) {
      // console.log('mongo lookup:', result.key);
      // locations[key] = result;
      return result;
    } else {
      // console.log('api lookup:', key);
      return lookupLocation(key).then(function (apiResult) {
        // locations[key] = apiResult;
        // Only save the data to mongodb when it's called from
        // the api. dont save on mongo or localcache lookup.
        apiResult.save = true;
        return apiResult;
      });
    }
  });
};

var isNumberKey = function (key) {
  return (key.indexOf('NUMBER') > -1 || key === "UNIQUE KEY" || key === "ZIP CODE" || key === "LATITUDE" || key === "LONGITUDE");
};

var chunkWrite = function (buffer) {
  if(countToSave > 100) {
    console.log('**pausing** countToSave:', countToSave);
    this.pause();
    // bulkCrashSave();
  }
  this.queue(buffer);
};

var saving = false;
var bulkCrashSave = function() {
  saving = true;
  var d = new Date();
  console.log('bulkCrashSave started:', d, crashData.length);
  var crashCol = db.collection('crashes');
  var batch = crashCol.initializeUnorderedBulkOp();

  _.forEach(crashData, function(strCrash) {
    var crash = JSON.parse(strCrash);
    batch.find({'unique_key': crash.unique_key}).upsert().updateOne({$set: crash});
  });

  batch.execute(function(err, result) {
    d = new Date();
    console.log('bulkCrashSave complete:', d, crashData.length);
    crashData = [];
    countToSave = 0;
    saving = true;
    chunkQueue.resume();
  });
};

var saveCrash = function (crash) {
  countToSave--;

  if(crash.unique_key === null || isNaN(crash.unique_key)) {
    // console.log(crash);
    return;
  }

  //upsert to mongodb on unique_key
  // console.log('updating:', crash.unique_key, '\nleft to save', countToSave);

  var crashes = db.collection('crashes');
  crashes.update({'unique_key': crash.unique_key},
    {$set: crash},
    {w: 1, 'upsert': true, 'fullResult': false},
    function (err, result) {
     // console.log('updated');
  });

  crash = null;
};

var saveLocation = function (location) {
  delete location.save;
  //upsert to mongodb on unique_key
  // console.log('updating:', location.key);

  var intersections = db.collection('intersections');
  intersections.update({'key': location.key},
    {$set: location},
    {w: 1, 'upsert': true, 'fullResult': false},
    function (err, result) {
     // console.log('updated');
  });

  location = null;
};

var saveTotals = function () {
  var d = Q.defer();
  var totalsColl = db.collection('totals');
  var saveData = {
    type: 'city',
    id: 'city',
    totals: ttl.totals
  };
  console.log('saving totals:', ttl.totals);
  totalsColl.update({'type': 'city', 'id': 'city'},
    {$set: saveData},
    {w: 1, 'upsert': true, 'fullResult': false},
    function (err, result) {
      console.log(err, result);
      db.close();
      ttl = null;
      d.resolve(true);
  });
  return d.promise;
};

var end = function () {
  this.queue = null;
};

var writeEnd = function () {
  console.log('done');
  deferred.resolve(true);
  // return saveTotals().then(function() {
  //     var shapeTotal = require('./shape_total');
  //     console.log(shapeTotal);
  //     return shapeTotal.calculateAllTotals().then(function() {
  //       deferred.resolve(true);
  //     });
  // });
};

var totalSaved = 0;

var crashWrite = function (buffer, next) {
  var tBuffer = {};
  var re = / /g;

  _.forOwn(buffer, function (val, key) {
    if (isNumberKey(key)) {
      tBuffer[key.toLowerCase().replace(re, '_')] = Number(val);
    } else {
      tBuffer[key.toLowerCase().replace(re, '_')] = val;
    }
  });

  tBuffer.date = transformDate(buffer.DATE, buffer.TIME);
  getLocation(tBuffer).then(function (locationInfo) {
    if (locationInfo.valid) {
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

    if(locationInfo.save) { saveLocation(locationInfo); }
    next(null, tBuffer);
  });

  buffer = null;
};

var crashTransform = through(crashWrite, writeEnd);

var chunkQueue = through(chunkWrite, end);

var checkPaused = function() {
  console.log('chunkQueue.paused:',chunkQueue.paused, '- ', countToSave);
  if(chunkQueue.paused && countToSave <  10) {
    console.log('**resuming**');
    chunkQueue.resume();
  }
};

var getCrashes = function () {
  var def = Q.defer();

  // console.log('fetching crashes');
  // def.resolve(fs.readFileSync('lib/data/crashes_medium.csv'));
  http.get('http://data.cityofnewyork.us/api/views/h9gi-nx95/rows.csv?accessType=DOWNLOAD', function (response) {

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

// var d = new Date();
//   console.log('bulkCrashSave started:', d, crashData.length);
//   var crashCol = db.collection('crashes');
//   var batch = crashCol.initializeUnorderedBulkOp();

//   _.forEach(crashData, function(strCrash) {
//     var crash = JSON.parse(strCrash);
//     batch.find({'unique_key': crash.unique_key}).upsert().updateOne({$set: crash});
//   });

//   batch.execute(function(err, result) {
//     d = new Date();
//     console.log('bulkCrashSave complete:', d, crashData.length);
//     crashData = [];
//     countToSave = 0;
//     saving = true;
//     chunkQueue.resume();
//   });

function* getFileContents(path) {
  var instream = fs.createReadStream(path);
  var outstream = new stream;
  var rl = readline.createInterface(instream, outstream);

  rl.on('line', function(line) {
    // process line here
  });

  rl.on('close', function() {
    // do something on finish here
  });
}

function* getCrashesGenerator(path) {
  console.log('processing file:', path);
  var crashCount = 0;
  var crashCol = db.collection('crashes');
  var batch = crashCol.initializeUnorderedBulkOp({w: 1});
  var deferred = Q.defer();
  var crashes = [];
  csv.fromPath(path, {'objectMode': true, 'headers': true})
  .transform(function(data, next) {
    crashWrite(data, next);
  })
  .on('data', function(crash) {
    crashCount++; totalSaved++;
    yield crash;

    // //console.log('crashCount:', crashCount);
    // batch.find({'unique_key': crash.unique_key}).upsert().updateOne({$set: crash});
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
    var d = new Date();
    console.log('bulkCrashSave End:', d, crashCount);
    // batch.execute();
    console.log('finished', totalSaved);
    deferred.resolve(true);
  });

  return deferred.promise;
}

var getCrashesLocal = function (path) {

  console.log('processing file:', path);
  var crashCount = 0;
  var crashCol = db.collection('crashes');
  var batch = crashCol.initializeUnorderedBulkOp({w: 1});
  var deferred = Q.defer();
  var crashes = [];
  csv.fromPath(path, {'objectMode': true, 'headers': true})
  .transform(function(data, next) {
    crashWrite(data, next);
  })
  .on('data', function(crash) {
    crashes.push(crash);
    crashCount++; totalSaved++;
    // //console.log('crashCount:', crashCount);
    // batch.find({'unique_key': crash.unique_key}).upsert().updateOne({$set: crash});
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
    var d = new Date();
    console.log('bulkCrashSave End:', d, crashCount);
    // batch.execute();
    console.log('finished', totalSaved);
    deferred.resolve(true);
  });

  return deferred.promise;
};

var fetchedCrashes = function(crashData) {
  console.log('saving crashes', crashData.length);
  var filePath = './crashData.csv';
  fs.writeFileSync(filePath, crashData);
  return filePath;
};


var refreshCrashes = function (mongoConnection) {
  ttl = new Totaler();
  var def = Q.defer();
  mongoConnection = mongoConnection || config.mongo;
  mc.connect(mongoConnection, function(err, conn) {
      if (err) {console.log('error connecting to mongodb\n', err); return false; }
      if(!err) {
        console.log('connected to mongo database');
        db = conn;
        //getCrashesLocal('./data/crashes_small.csv')
        // getCrashes().then(function (result) {
        //   var path = fetchedCrashes(result);
        //   return getCrashesLocal(path);
        // });
        return getCrashesLocal('./crashData.csv');
      }
  });
  return def.promise;
};

module.exports = {
  refreshCrashes:refreshCrashes
};
