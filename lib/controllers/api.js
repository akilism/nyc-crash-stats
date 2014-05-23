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

var sendFile = function (path, res) {
  readFile(path, 'utf-8').done(function (fileContents) {
    res.send(JSON.parse(fileContents));
  });
};

var connectSocrata = function (url) {
  var deferred = Q.defer();

  request(url, function (error, response, body) {
    if(!error) {
      var data = JSON.parse(body);
      deferred.resolve(data);
    } else {
      deferred.reject(error);
    }
  });

  return deferred.promise;
};


var saveData = function (data) {
  console.log('saving data');
  var dataToCache = {
    'crashData': data,
    'updatedTime': metadata.rowsUpdatedAt
  };

  var isSet = dataCache.set('crashData', dataToCache);
};


var getData = function (urls, res) {
  var data = {};
  var promises = [];

  _.forEach(urls, function (url) {
    promises.push(connectSocrata(url.url));
  });

  Q.allSettled(promises).then(function (results) {
    _.forEach(results, function(result, i) {
      data[urls[i].saveKey] = result.value;
    });

    saveData(data);
    res.json(data);
  });
};


/**
 * Get the base data set. it's updated daily from the socrata api with these calls.
 */
exports.baseData = function (req, res) {

  dataCache.get('crashData', function (err, cachedData) {
    var url = data_urls.metadataUrl;

    request(url, function (error, response, body) {
      // console.log('request back');
        if(!error) {
          metadata = JSON.parse(body);
          var updatedTime = metadata.rowsUpdatedAt;
          // console.log('cachecheck', updatedTime, cachedData, (updatedTime > cachedData.updatedTime));
          if (!cachedData.crashData || updatedTime > cachedData.crashData.updatedTime) {
            getData(data_urls.url, res);
          } else {
            res.json(cachedData.crashData.crashData);
          }
        }
    });
  });
};


exports.location = function (req, res) {
  var url = data_urls.locationQuery(latitude, longitude);

  request(url, function (error, response, body) {
    // console.log('request back');
    if(!error) {
      res.json(body);
    }
  });
};


var getShapeFile = function (type, properties) {
  var path;

  //load file search for correct geometry return it.
  switch (type) {
    case 'precinct':
      path = dataPath + '/precinct.geojson';
      break;
    case 'community':
      path = dataPath + '/community.geojson';
      break;
    case 'zipcode':
      path = dataPath + '/zipcode.geojson';
      break;
    default:
      return null;
  }

  return readFile(path, 'utf-8');
};

var getValidAccidents = function (shape, accidents) {
  return _.filter(accidents, function (accident) {
    var inPoly = gju.pointInPolygon({
      'type': 'Point',
      'coordinates': [accident.location.longitude, accident.location.latitude]
    }, shape);
    return (inPoly) ? true : false;
  });
};

var getBoundedAccidents = function (body, type, properties) {
  var deferred = Q.defer();

  getShapeFile(type, properties).then(function (fileContents) {
    var fileData = JSON.parse(fileContents);

    //filter the shapes in the datafile by id selected.
    var features = _.filter(fileData.features, function (feature) {
        if(feature.properties.hasOwnProperty('@id')) {
          return feature.properties['@id'] === properties['@id'];
        }
        return false;
    });

    //return the accidents that intersect the correct shape.
    var validAccidents = [];
    var accidents = JSON.parse(body);

    _.forEach(features, function (feature) {
      validAccidents = validAccidents.concat(getValidAccidents(feature.geometry, accidents));
    });

    // console.log(validAccidents);
    deferred.resolve(validAccidents);
  });

  return deferred.promise;
};

exports.feature = function (req, res) {
  var url = data_urls.boundingBoxQuery(JSON.parse(req.query.boundingBox));
  request(url, function (error, response, body) {
    // console.log('request back');
    if(!error) {
      getBoundedAccidents(body, req.query.type, JSON.parse(req.query.properties)).then(function (accidents) {
        res.send(accidents);
      });
    }
  });
};





// Get specific geojson shapefiles.
exports.subway = function (req, res) {
  sendFile(dataPath + '/subway.geojson', res);
};

exports.precinct = function (req, res) {
  sendFile(dataPath + '/precinct.geojson', res);
};

exports.community = function (req, res) {
  sendFile(dataPath + '/community.geojson', res);
};

exports.zipcode = function (req, res) {
  sendFile(dataPath + '/zipcode.geojson', res);
};
