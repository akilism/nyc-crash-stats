
var intersectionFinder = (function () {
  var through = require('through'),
    http = require('http'),
    mc = require('mongodb').MongoClient,
    _ = require('lodash'),
    config = require('../config/config'),
    Q = require('q'),
    stream = require('stream'),
    gc = require('./nyc-geoclient'),
    dataMongo = require('../controllers/data_mongo'),
    locations = {},
    db;

  gc.setApi('7e66478437762cefc8a569314c6af580','0de4b98b');

  var getKey = function(buffer) {
    var data = [buffer.on_street_name, buffer.cross_street_name, buffer.borough, buffer.zip_code];
    var re = / /g;
    return data.join('%').replace(re, '_');
  };

  var getBorough = function(borough) {
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

  var fetchIntersection = function(collectionName, query, options) {
    var deferred = Q.defer();
    var mongoConnection = mongoConnection || config.mongo;
    mc.connect(mongoConnection, function(err, conn) {
      if (err) {console.log('error connecting to mongodb\n', err); return false; }
      if(!err) {
        // console.log('connected to mongo database');
        db = conn;
        var collection = db.collection(collectionName);
        var stream = collection.find(query, options).stream();
        var intersection;

        stream.on('data', function(item) {
          // console.log('data', item);
          intersection = item;
        });

        stream.on('end', function() {
          db.close();
          // console.log(query, options, intersection || 'no match');
          deferred.resolve(intersection);
        });
      }
    });

    return deferred.promise;
  };

  var getMongoLoctation = function(key) {
    var query = {'key': key};
    return fetchIntersection('intersections', query, {});
  };

  // Connects to NYC Geoclient API to do intersection look up.
  var lookupLocation = function(key) {
    var location = extractKey(key);

    if(!location.on_street_name || !location.zip_code || location.zip_code === '0') {
      return Q({
        valid: false
      });
    }

    var deferred = Q.defer();
    var borough = getBorough(location.borough);

    gc.intersection(location.on_street_name, location.cross_street_name, borough, location.zip_code, null, gc.RESPONSE_TYPE.json,
      function(err, resp) {
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

  var getLocation = function(buffer) {
    var key = getKey(buffer);

    var extractedKey = extractKey(key);

    if (extractedKey.zip_code === '0' || !extractedKey.cross_street_name) { return Q({ valid: false }); }

    if(locations[key]) {
      // console.log('local lookup:', key);
      return Q(locations[key]);
    }

    return getMongoLoctation(key).then(function(result) {
      if(result && result.location) {
        // console.log('mongo lookup:', result.key);
        // locations[key] = result;
        return result;
      } else {
        // console.log('api lookup:', key);
        return lookupLocation(key).then(function(apiResult) {
          // locations[key] = apiResult;
          // Only save the data to mongodb when it's called from
          // the api. dont save on mongo or localcache lookup.
          apiResult.save = true;
          return apiResult;
        });
      }
    });
  };

  var saveLocation = function(location) {
    delete location.save;
    //upsert to mongodb on unique_key
    // console.log('updating:', location.key);

    var intersections = db.collection('intersections');
    intersections.update({'key': location.key},
      {$set: location},
      {w: 1, 'upsert': true, 'fullResult': false},
      function(err, result) {
       // console.log('updated');
    });

    location = null;
  };

  return {
    getLocation:getLocation,
    saveLocation:saveLocation
  };
}());

module.exports = intersectionFinder;
