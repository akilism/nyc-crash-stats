'use strict';

var Q = require('q'),
path = require('path'),
fs = require('fs'),
_ = require('lodash');

var readFile = Q.denodeify(fs.readFile);
var dataPath = path.normalize(__dirname + '/../data');


// Return a local file as the response.
var sendFile = function (path) {
  return readFile(path, 'utf-8');
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

var getKey = function(type) {
  switch (type) {
    case 'zipcode':
      return 'postalCode';
    case 'borough':
      return 'borough';
    case 'neighborhood':
      return 'neighborhood';
    case 'community':
      return 'communityDistrict';
    case 'citycouncil':
      return 'cityCouncilDistrict';
    case 'precinct':
      return 'policePrecinct';
  }
};

// // the shape for an area based on a type and identifer. used to build stats pages
// // for specific zipcodes, community districts, etc.
var getShape = function(type, identifier) {
  var deferred = Q.defer();

  var filterFunc = function (feature) {
    var property = getKey(type);

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

module.exports = {
  sendFile:sendFile,
  getShapeFile:getShapeFile,
  getShape:getShape,
  getKey:getKey
};
