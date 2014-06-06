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

// Return a local file as the response.
var sendFile = function (path, res) {
  readFile(path, 'utf-8').done(function (fileContents) {
    res.send(JSON.parse(fileContents));
  });
};


// Connect to the Socrata API endpoint.
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


// Cache the base data so we aren't always making the initial Socrata call.
var saveData = function (data, key) {
  console.log('saving data', key);
  var dataToCache = {
    'data': data,
    'updatedTime': metadata.rowsUpdatedAt
  };

  var isSet = dataCache.set(key, dataToCache);
};

// Get an array of Socrata connection promises.
var getPromises = function (urls) {
  var promises = [];

  _.forEach(urls, function(url) {
    promises.push(connectSocrata(url.url));
  });

  return promises;
};


// Get the base data. Makes a number of API calls to get the relevant data.
var getData = function (urls, res) {
  var data = {};
  var promises = getPromises(urls);

  Q.allSettled(promises).then(function (results) {
    _.forEach(results, function(result, i) {
      data[urls[i].saveKey] = result.value;
    });

    saveData(data, 'crashData');
    res.json(data);
  });
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

// Find all accidents that are inside the shapes bounds.
var getValidAccidents = function (shape, accidents) {
  return _.filter(accidents, function (accident) {
    var inPoly = gju.pointInPolygon({
      'type': 'Point',
      'coordinates': [accident.location.longitude, accident.location.latitude]
    }, shape);
    return (inPoly) ? true : false;
  });
};

// Get the shape file then find the correct shape then filter the accidents and return the filtered array of accidents.
var getBoundedAccidents = function (accidents, type, properties) {
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
    // var accidents = JSON.parse(accidents);

    _.forEach(features, function (feature) {
      validAccidents = validAccidents.concat(getValidAccidents(feature.geometry, accidents));
    });

    // console.log(validAccidents);
    console.log('Valid Accidents: ', validAccidents.length);
    deferred.resolve(validAccidents);
  });

  return deferred.promise;
};

// Get all the batch urls. Need to query the entire set of
// matching accidents for the bounding box. There are potentially
// accidents that fall in the feature area that are not in the initial
// 1000 returned.
var getBatchUrls = function (count, boundingBox) {
  var batches = Math.ceil(count / 1000);
  var urls = [];

  for(var i = 0; i < batches; i++) {
    urls.push(data_urls.boundingBoxQuery(boundingBox, i * 1000, 1000));
  }

  return urls;
};

// Return the results of running the batch of Socrata API calls.
var getAllAccidentsForBoundingBox = function (count, boundingBox) {
  var urls = getBatchUrls(count, boundingBox);
  var promises = getPromises(urls);

  return Q.allSettled(promises).then(function (results) {
    return _.flatten(results, 'value');
  });
};


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

var boundingBoxAroundPolyCoords = function (coords) {
    var xAll = [], yAll = [];
    for (var i = 0; i < coords[0].length; i++) {
      xAll.push(coords[0][i][1]);
      yAll.push(coords[0][i][0]);
    }

    xAll = xAll.sort(function (a,b) { return a - b; });
    yAll = yAll.sort(function (a,b) { return a - b; });

    return [ [xAll[0], yAll[0]], [xAll[xAll.length - 1], yAll[yAll.length - 1]] ];
};

var buildFeature = function (featureProperties) {
  var feature = {};

  if(featureProperties.hasOwnProperty('postalCode')) {
    return {
      'type': 'zipcode',
      'identifier': featureProperties.postalCode
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
      'identifier': featureProperties.neighborhood
    };
  }

  if (featureProperties.hasOwnProperty('policePrecinct')) {
    return {
      'type': 'precinct',
      'identifier': featureProperties.policePrecinct
    };
  }

};

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
      _.forEach(fileData.features, function (feature) {
        var feature = buildFeature(feature.properties);
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

// load all geo files pull out type and id.
var getGeoInfo = function (res) {
  dataCache.get('geoMeta', function (err, cachedData) {
    // console.log(cachedData);
    if (cachedData.geoMeta) {
      console.log('cacheddata:  ', cachedData.geoMeta.data.length);
      res.json(cachedData.geoMeta.data);
    } else {
      getAllGeoFiles(res);
    }
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
            res.json(cachedData.crashData.data);
          }
        }
    });
  });
};


// Get all the accidents for a specific lat / lon coordinate.
exports.location = function (req, res) {
  // var url = data_urls.locationQuery(latitude, longitude);

  // request(url, function (error, response, body) {
  //   // console.log('request back');
  //   if(!error) {
  //     res.json(body);
  //   }
  // });
};

// Return all accidents for a feature
// (police precinct, zipcode, community district)
// can work with any geojson shape.
exports.feature = function (req, res) {
  //get total count for bounding box.
  //get all accidents in area.
  //get the accidents bounded by the exact shape.

  var boundingBox = JSON.parse(req.query.boundingBox);
  var url = data_urls.boundingBoxCount(boundingBox);

  // console.log(url);

  request(url, function (error, response, body) {
    if(!error) {
      var countJson = JSON.parse(body);
      var count = countJson[0].total;
      console.log('Returned Count: ', count);

      getAllAccidentsForBoundingBox(count, boundingBox).then(function (allAccidents) {
        console.log('All Accidents: ', allAccidents.length);
        return getBoundedAccidents(allAccidents, req.query.type, JSON.parse(req.query.properties));
      }).then(function (accidents) {
        res.send(accidents);
      });

    }
  });
};

var formatBoundingBox = function (boundingBox) {
  return {
    leftLat: boundingBox[0][0],
    leftLon: boundingBox[0][1],
    rightLat: boundingBox[1][0],
    rightLon: boundingBox[1][1],
  };
};

var getShapeDaily = function (req, res) {
  getShape(req.query).then(function (shape) {
    var boundingBox = boundingBoxAroundPolyCoords(shape[0].geometry.coordinates);
    boundingBox = formatBoundingBox(boundingBox);
    var url = data_urls.dailyTotals(boundingBox);
    console.log(url);
    request(url, function (error, response, body) {
      if(!error) {
        var rawData = JSON.parse(body);

        _.forOwn(rawData, function(val, key) {
          if(!isNaN(parseInt(val, 10))) {
            rawData[key] = parseInt(val, 10);
          }
        });

        res.send(rawData);
      }
    });
  });
};

var getCityDaily = function (req, res) {
  var url = data_urls.dailyTotals();

  request(url, function (error, response, body) {
    if(!error) {
      var rawData = JSON.parse(body);

      _.forOwn(rawData, function(val, key) {
        if(!isNaN(parseInt(val, 10))) {
          rawData[key] = parseInt(val, 10);
        }
      });
      // console.log(rawData);
      res.send(rawData);
    }
  });
};

exports.daily = function (req, res) {
  if(req.query.hasOwnProperty('type')) {
    getShapeDaily(req, res);
  } else {
    getCityDaily(req, res);
  }
};


// Get specific geojson shapefiles.
exports.borough = function (req, res) {
  sendFile(dataPath + '/borough.geojson', res);
};

exports.citycouncil = function (req, res) {
  sendFile(dataPath + '/citycouncil.geojson', res);
};

exports.community = function (req, res) {
  sendFile(dataPath + '/community.geojson', res);
};

exports.neighborhood = function (req, res) {
  sendFile(dataPath + '/neighborhood.geojson', res);
};

exports.precinct = function (req, res) {
  sendFile(dataPath + '/precinct.geojson', res);
};

exports.subway = function (req, res) {
  sendFile(dataPath + '/subway.geojson', res);
};

exports.zipcode = function (req, res) {
  sendFile(dataPath + '/zipcode.geojson', res);
};

exports.allGeo = function (req, res) {
  getGeoInfo(res);
};
