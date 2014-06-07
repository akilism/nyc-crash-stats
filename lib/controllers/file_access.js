'use strict';

var data_urls = require('./data_urls'),
    request = require('request'),
    Q = require('q'),
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    NodeCache = require( "node-cache" ),
    gju = require('geojson-utils');

var dataCache = new NodeCache();
var readFile = Q.denodeify(fs.readFile);
var dataPath = path.normalize(__dirname + '/../data');
var file = 'cache.json';
var metadata;

// Cache the base data so we aren't always making the initial Socrata call.
var saveData = function (data, key) {
  console.log('saving data', key);
  var dataToCache = {
    'data': data,
    'updatedTime': (metadata) ? metadata.rowsUpdatedAt : null
  };

  var isSet = dataCache.set(key, dataToCache);
};

var buildFeature = function (featureProperties) {
  var feature = {};

  if(featureProperties.hasOwnProperty('postalCode')) {
    return {
      'type': 'zipcode',
      'identifier': featureProperties.postalCode,
      'borough': featureProperties.borough
    };
  }

  if (featureProperties.hasOwnProperty('communityDistrict')) {
    return {
      'type': 'community',
      'identifier': featureProperties.communityDistrict
    };
  }

  if (featureProperties.hasOwnProperty('cityCouncilDistrict')) {
    return {
      'type': 'citycouncil',
      'identifier': featureProperties.cityCouncilDistrict
    };
  }

  if (featureProperties.hasOwnProperty('neighborhood')) {
    return {
      'type': 'neighborhood',
      'identifier': featureProperties.neighborhood,
      'borough': featureProperties.borough
    };
  }

  if (featureProperties.hasOwnProperty('policePrecinct')) {
    return {
      'type': 'precinct',
      'identifier': featureProperties.policePrecinct,
      'borough': featureProperties.borough
    };
  }
};

// Get the shape file for the requested type.
var getShapeFile = function (type, properties) {
  var path;

  //load file search for correct geometry return it.
  switch (type) {
    case 'borough':
      path = dataPath + '/borough.geojson';
      break;
    case 'citycouncil':
      path = dataPath + '/citycouncil.geojson';
      break;
    case 'community':
      path = dataPath + '/community.geojson';
      break;
    case 'neighborhood':
      path = dataPath + '/neighborhood.geojson';
      break;
    case 'precinct':
      path = dataPath + '/precinct.geojson';
      break;
    case 'zipcode':
      path = dataPath + '/zipcode.geojson';
      break;
    default:
      return null;
  }

  return readFile(path, 'utf-8');
};

// the shape for an area based on a type and identifer. used to build stats pages
// for specific zipcodes, community districts, etc.
var getShape = function(options) {
  var type = options.type.toLowerCase();
  var identifier = options.value.toLowerCase();
  var deferred = Q.defer();

  var filterFunc = function (feature) {
    var property;

    switch (type) {
      case 'zipcode':
        property = 'postalCode';
        break;
      case 'borough':
        property = 'borough';
        break;
      case 'neighborhood':
        property = 'neighborhood';
        break;
      case 'community':
        property = 'communityDistrict';
        break;
      case 'citycouncil':
        property = 'cityCouncilDistrict';
        break;
      case 'precinct':
        property = 'policePrecinct';
        break;
    }
    if(feature.properties.hasOwnProperty(property)) {
      var featureVal = feature.properties[property] + '';
      return featureVal.toLowerCase() === identifier;
    }
    return false;
  };

  getShapeFile(type, identifier).then(function (fileContents) {
    var fileData = JSON.parse(fileContents);
    //filter the shapes in the datafile by id selected.
    var features = _.filter(fileData.features, filterFunc);
    deferred.resolve(features);
  });

  return deferred.promise;
};

//load all geojson shape files.
var getAllGeoFiles = function (res) {
  var files = ['citycouncil', 'community', 'neighborhood', 'precinct', 'zipcode'];
  var promises = [];
  var data = [];
   _.forEach(files, function (file) {
    promises.push(getShapeFile(file, null));
  });

  Q.allSettled(promises).then(function (results) {
    _.forEach(results, function(result, i) {
      var fileData = JSON.parse(result.value);
      _.forEach(fileData.features, function (fileFeature) {
        var feature = buildFeature(fileFeature.properties);
        var found = _.find(data, function (stored) {
          if (stored.identifier === feature.identifier && stored.type === feature.type) {
            return true;
          }
          return false;
        });
        if(!found) { data.push(feature); }
      });
    });
    saveData(data, 'geoMeta');
    res.json(data);
  });
};

