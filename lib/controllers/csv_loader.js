'use strict';

console.log(process.cwd());

var through = require('through'),
  csv = require('csv'),
  http = require('http'),
  mc = require('mongodb').MongoClient,
  _ = require('lodash'),
  config = require('../config/config'),
  Q = require('q'),
  fs = require('fs'),
  gc = require('../helpers/nyc-geoclient'),
  dataMongo = require('./data_mongo');

gc.setApi('7e66478437762cefc8a569314c6af580','0de4b98b');

//remember locations that have been previously looked up.
var locations = {};

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

//Relies on lat and lon being in dataset.
// var getLocation = function (buffer) {
//   var location = false;

//   if (buffer.LATITUDE && buffer.LONGITUDE && buffer.LATITUDE !== '' && buffer.LONGITUDE !== '') {
//       location = {
//         'latitude': Number(buffer.LATITUDE),
//         'longitude': Number(buffer.LONGITUDE)
//       };
//     } else if (buffer.LOCATION) {
//       console.log('raw location: ', buffer.LOCATION);
//       var parts = buffer.LOCATION.replace('(', '').replace(')', '').split(',');
//       location = {
//         'latitude': Number(parts[0]),
//         'longitude': Number(parts[1])
//       };
//     } else {
//     }

//   return location;
// };

var getMongoLoctation = function(key) {
  var query = {'key': key};
  return dataMongo.fetchIntersection('intersections', query, {});
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
    console.log('local lookup:', key);
    return Q(locations[key]);
  }

  return getMongoLoctation(key).then(function (result) {
    if(result && result.location) {
      console.log('mongo lookup:', result.key);
      locations[key] = result;
      return result;
    } else {
      console.log('api lookup:', key);
      return lookupLocation(key).then(function (apiResult) {
        locations[key] = apiResult;
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

var countToSave = 0;

var chunkWrite = function (buffer) {
  this.queue(buffer);
};

var db;
var deferred = Q.defer();

var saveCrash = function (crash) {
  countToSave--;

  if(crash.unique_key === null || isNaN(crash.unique_key)) {
    console.log(crash);
    return;
  }

  //upsert to mongodb on unique_key
  console.log('updating:', crash.unique_key, '\nleft to save', countToSave);

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
  console.log('updating:', location.key);

  var intersections = db.collection('intersections');
  intersections.update({'key': location.key},
    {$set: location},
    {w: 1, 'upsert': true, 'fullResult': false},
    function (err, result) {
     // console.log('updated');
  });

  location = null;
};

var end = function () {
  console.log('done');
  db.close();
  deferred.resolve(true);
};

var crashWrite = function (buffer) {
  countToSave++;
  if(countToSave > 50) { this.pause(); }

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
      tBuffer.city_council_district = locationInfo.cityCouncilDistrict;
      tBuffer.assembly_district = locationInfo.assemblyDistrict;
      tBuffer.congressional_district = locationInfo.congressionalDistrict;
      tBuffer.police_precinct = locationInfo.policePrecinct;
      tBuffer.loc = { type: 'Point', coordinates: [locationInfo.location.longitude, locationInfo.location.latitude] };
    }  else {
      tBuffer.location = false;
    }
    saveCrash(tBuffer);

    if(locationInfo.save) {
      saveLocation(locationInfo);
    }

    checkPaused();
    this.queue(false);
  });

  buffer = null;
};

var crashTransform = through(crashWrite, end);

var chunkQueue = through(chunkWrite, end);

var checkPaused = function() {
  if(crashTransform.paused && countToSave <  10) {
    crashTransform.resume();
    console.log('**resuming**');
  }
};

var getCrashes = function () {
  http.get('http://data.cityofnewyork.us/api/views/h9gi-nx95/rows.csv?accessType=DOWNLOAD', function (response) {
    response
    .pipe(chunkQueue)
    .pipe(csv.parse({'columns': true, 'autoparse': true}))
    .pipe(crashTransform);
    // .pipe(crashSave);
  });
  return deferred.promise;
};


var getCrashesLocal = function () {
  //load crashes from a local csv for testing.
  fs.createReadStream('./data/crashes.csv')
  .pipe(csv.parse({'columns': true, 'autoparse': true}))
  .pipe(crashTransform);

  return deferred.promise;
};

var refreshCrashes = function () {
  var def = Q.defer();
  mc.connect(config.mongo, function(err, conn) {
      if (err) {console.log('error connecting to mongodb\n', err); return false; }
      if(!err) {
        console.log('connected to mongo database');
        db = conn;
        getCrashes().then(function (result) {
          def.resolve(result);
        });
      }
  });
  return def.promise;
};

module.exports = {
  refreshCrashes:refreshCrashes
};

