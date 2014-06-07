'use strict';

var through = require('through'),
  csv = require('csv'),
  http = require('http'),
  mc = require('mongodb').MongoClient,
  _ = require('lodash'),
  config = require('../config/config'),
  Q = require('q');

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

var getLocation = function (buffer) {
  var location = false;

  if (buffer.LATITUDE && buffer.LONGITUDE && buffer.LATITUDE !== '' && buffer.LONGITUDE !== '') {
      location = {
        'latitude': Number(buffer.LATITUDE),
        'longitude': Number(buffer.LONGITUDE)
      };
    } else if (buffer.RAW_LOCATION) {
      console.log('raw location: ', buffer.RAW_LOCATION);
      var parts = buffer.RAW_LOCATION.replace('[', '').replace(']', '').split(',');
      location = {
        'latitude': Number(parts[0]),
        'longitude': Number(parts[1])
      };
    }

  return location;
};

var isNumberKey = function (key) {
  return (key.indexOf('NUMBER') > -1 || key === "UNIQUE KEY" || key === "ZIP CODE" || key === "LATITUDE" || key === "LONGITUDE");
};

var crashWrite = function (buffer) {
  var tBuffer = {};
  var re = / /g;

  _.forOwn(buffer, function (val, key) {
    if (isNumberKey(key)) {
      tBuffer[key.toLowerCase().replace(re, '_')] = Number(val);
    } else {
      tBuffer[key.toLowerCase().replace(re, '_')] = val;
    }
  });

  var location = getLocation(buffer);

  if (location) {
    tBuffer.location = location;
    tBuffer.loc = { type: 'Point', coordinates: [location.longitude, location.latitude] };
  }

  tBuffer.date = transformDate(buffer.DATE, buffer.TIME);

  this.queue(tBuffer);
};

var chunkWrite = function (buffer) {
  this.queue(buffer);
};

var db;
var deferred = Q.defer();

var saveCrash = function (crash) {
  if(crash.unique_key === null || isNaN(crash.unique_key)) {
    console.log(crash);
    return;
  }

  //upsert to mongodb on unique_key
  // console.log(crash);
  var crashes = db.collection('crashes');
  crashes.update({'unique_key': crash.unique_key},
    {$set: crash},
    {w: 1, 'upsert': true, 'fullResult': false},
    function (err, result) {
     // console.log('updated: ', crash.unique_key, result);
  });
};

var end = function () {
  console.log('done');
};

var saveEnd = function () {
  console.log('save done');
  deferred.resolve(true);
};

var crashTransform = through(crashWrite, end);

var chunkQueue = through(chunkWrite, end);

var crashSave = through(saveCrash, end);


var getCrashes = function () {

  http.get('http://data.cityofnewyork.us/api/views/h9gi-nx95/rows.csv?accessType=DOWNLOAD', function (response) {
    response
    .pipe(chunkQueue)
    .pipe(csv.parse({'columns': true, 'autoparse': true}))
    .pipe(crashTransform)
    .pipe(crashSave);
  });
  return deferred.promise;
};

var refreshCrashes = function () {
  var def = Q.defer();
  mc.connect(config.mongo, function(err, conn) {
      if(!err) {
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

