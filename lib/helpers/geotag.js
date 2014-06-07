// read each file
// loop features
// geo intersect feature for crashes
// update crash to have type: identifier
// change query to not use geoinersects but just query on identifier in type


var dataFile = require('../controllers/data_file'),
    dataMongo = require('../controllers/data_mongo'),
    Q = require('q'),
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash');


// Build a feature object based on some properties. Needed to filter shapes.
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

//load geojson shape files.
var getGeoFile = function (files) {
  var data = [],
    promises = _.map(files, function (file) {
      return dataFile.file.getShapeFile(file, null);
    });

  return Q.allSettled(promises).then(function (results) {
    _.forEach(results, function(result, i) {
      var fileData = JSON.parse(result.value);
      _.forEach(fileData.features, function (fileFeature) {
        var feature = buildFeature(fileFeature.properties);
        feature.geometry = fileFeature.geometry;
        var found = _.find(data, function (stored) {
          if (stored.identifier === feature.identifier && stored.type === feature.type) {
            return true;
          }
          return false;
        });
        if(!found) { data.push(feature); }
      });
    });
    return data;
  });
};

var geoIntersectFiles = function () {
  var files = ['citycouncil', 'community', 'neighborhood', 'precinct', 'zipcode'];
  files = ['precinct'];
  var promises = [];
  getGeoFile(files).then(function (features) {
    var promiseMap = function (feature) {
      return dataMongo.mongo.geoTag(feature);
    };

    return Q.allSettled(_.map(features, promiseMap));
  }).then(function (results) {
    console.log(results);
  });
};

geoIntersectFiles();
