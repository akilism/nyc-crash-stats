'use strict';

var data_urls = require('./data_urls'),
  dataFile = require('./data_file'),
  request = require('request'),
  Q = require('q'),
  _ = require('lodash'),
  gju = require('geojson-utils');


// Connect to the Socrata API endpoint.
var connectSocrata = function (url) {
  var deferred = Q.defer();
  console.log('connectSocrata', url);
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

// Get an array of Socrata connection promises.
var getPromises = function (urls) {
  var promises = [];

  _.forEach(urls, function(url) {
    if (url.hasOwnProperty('url')) {
      promises.push(connectSocrata(url.url));
    } else {
      promises.push(connectSocrata(url));
    }
  });

  return promises;
};

// Get the base data. Makes a number of API calls to get the relevant data.
var getBaseData = function () {
  var data = {};
  var urls = data_urls.url;
  var promises = getPromises(urls);

  return Q.allSettled(promises).then(function (results) {
    _.forEach(results, function(result, i) {
      data[urls[i].saveKey] = result.value;
    });

    return data;
  });
};

// Find all accidents that are inside the shapes bounds.
var getValidAccidents = function (shape, accidents) {
  return _.filter(accidents, function (accident) {
    var inPoly = gju.pointInPolygon({
      'type': 'Point',
      'coordinates': [accident.loc.longitude, accident.loc.latitude]
    }, shape);
    return (inPoly) ? true : false;
  });
};

// Get the shape file then find the correct shape then filter the accidents and return the filtered array of accidents.
var getBoundedAccidents = function (accidents, type, properties) {
  var deferred = Q.defer();

  dataFile.getShapeFile(type, properties).then(function (fileContents) {
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

    console.log('Valid Accidents: ', validAccidents.length);
    deferred.resolve(validAccidents);
  });

  return deferred.promise;
};

var getBoundedAccidentsForShapes = function (accidents, shapes) {
    //return the accidents that intersect the correct shape.
    var validAccidents = [];

    _.forEach(shapes, function (feature) {
      validAccidents = validAccidents.concat(getValidAccidents(feature.geometry, accidents));
    });

    console.log('Valid accidents: ', validAccidents.length);
    return validAccidents;
};

var getYearRange = function (year) {
  if(year === 'all') { return null; }

  var range = {
    'start': null,
    'end': null
  };

  switch(year) {
    case '2014-01-01':
    range.start = '2014-01-01';
    break;
    case '2013-01-01':
    range.start = '2013-01-01';
    range.end = '2014-01-01';
    break;
    case '2012-01-01':
    range.start = '2012-01-01';
    range.end = '2013-01-01';
    break;
  }

  return range;
};

// Get all the batch urls. Need to query the entire set of
// matching accidents for the bounding box. There are potentially
// accidents that fall in the feature area that are not in the initial
// 1000 returned.
var getBatchUrls = function (count, boundingBox, singleYear, yearRange) {
  var batches = Math.ceil(count / 1000);
  var urls = [];
  var queryFunction = (singleYear) ? data_urls.boundingBoxQueryByYear : data_urls.boundingBoxQuery;

  for(var i = 0; i < batches; i++) {
    urls.push(queryFunction(boundingBox, i * 1000, 1000, yearRange));
  }

  return urls;
};

// Return the results of running the batch of Socrata API calls.
var getAllAccidentsForBoundingBox = function (count, boundingBox, singleYear, yearRange) {
  var urls = getBatchUrls(count, boundingBox, singleYear, yearRange);
  var promises = getPromises(urls);

  return Q.allSettled(promises).then(function (results) {
    // _.forEach(results, function (result, i) {
    //   // console.log('result length: ', i, result.value.length);
    // });
    return _.flatten(results, 'value');
  });
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

var formatBoundingBox = function (boundingBox) {
  return {
    leftLat: boundingBox[0][0],
    leftLon: boundingBox[0][1],
    rightLat: boundingBox[1][0],
    rightLon: boundingBox[1][1]
  };
};

//Get the box that surrounds all the boxes.
var getMaxBox = function (boundingBoxes) {
  if(boundingBoxes.length === 1) {
    return boundingBoxes[0];
  }

  var finalBox = boundingBoxes[0];

  _.forEach(boundingBoxes, function(box) {
    if (box.leftLat < finalBox.leftLat && box.leftLon < finalBox.leftLon) {
      finalBox.leftLat = box.leftLat;
      finalBox.leftLon = box.leftLon;
    }

    if (box.rightLat > finalBox.rightLat && box.rightLon > finalBox.rightLon) {
      finalBox.rightLat = box.rightLat;
      finalBox.rightLon = box.rightLon;
    }
  });

  return finalBox;
};

var getCountAccidentsInBoundingBox = function (boundingBox, singleYear, year) {
  var url = (singleYear) ? data_urls.boundingBoxCountByYear(boundingBox, year) : data_urls.boundingBoxCount(boundingBox);
  var deferred = Q.defer();

  console.log(url, boundingBox, singleYear, year);

  request(url, function (error, response, body) {
    if(!error) {
      var countJson = JSON.parse(body);
      var count = countJson[0].total;
      console.log('Returned Count: ', count);
      deferred.resolve(count);
    } else {
      deferred.reject(error);
    }
  });

  return deferred.promise;
};

//Fetch accidents from socrata
// get correct shapes
// gets a bounding box around the shapes
// gets a count of the accidents in the bounding box.
// gets all accidents in bounding box.
// gets accidents that fall inside the valid shapes.
// saves the accidents to redis
// if a response object is passed in send the accidents back as a http response.
var fetchAccidents = function (type, identifier, year) {
  var singleYear = (year.toLowerCase() === 'all') ? false : true,
  yearRange = getYearRange(year),
  maxBox,
  shapes,
  finalData = {};

  return dataFile.getShape(type, identifier).then(function (validShapes) {
    shapes = validShapes;
    finalData.shapes = validShapes;
    var boundingBoxes = _.map(shapes, function (shape) {
      return formatBoundingBox(boundingBoxAroundPolyCoords(shape.geometry.coordinates));
    });
    maxBox = getMaxBox(boundingBoxes);
    return getCountAccidentsInBoundingBox(maxBox, singleYear, yearRange);
  })
  .then(function (count) {
    return getAllAccidentsForBoundingBox(count, maxBox, singleYear, yearRange);
  })
  .then(function (allAccidents) {
    return getBoundedAccidentsForShapes(allAccidents, shapes);
  })
  .then(function (accidents) {
    console.log('Fetched Accidents Length: ' + accidents.length);
    finalData.accidents = accidents;
    return finalData;
  });
};

var getCityDaily = function () {
  var url = data_urls.dailyTotals();
  var deferred = Q.defer();

  request(url, function (error, response, body) {
    if(!error) {
      var rawData = JSON.parse(body);

      _.forOwn(rawData, function(val, key) {
        if(!isNaN(parseInt(val, 10))) {
          rawData[key] = parseInt(val, 10);
        }
      });
      deferred.resolve(rawData);
    } else { deferred.reject(error); }
  });

  return deferred.promise;
};

var getCurrentViewInformation = function (lastUniqueKey) {
  var url = 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=unique_key&$limit=1&$order=unique_key DESC';
  var deferred = Q.defer();
  console.log(url);
  request(url, function (error, response, body) {
    // console.log('request back');
    if(!error) {
      console.log(body);
      try {
        deferred.resolve(JSON.parse(body)[0].unique_key);
      }
      catch (e) {
        deferred.reject(e);
      }
    }
  });

  return deferred.promise;
};

var getNewCrashes = function (lastUniqueKey, socrataLastKey) {
  var deferred = Q.defer();
  if(Number(socrataLastKey) - Number(lastUniqueKey) > 0) {
    var countNewKeys = Number(socrataLastKey) - Number(lastUniqueKey);
    var requestCount = Math.ceil(countNewKeys / 1000);
    var urls = [];
    var offset;
    for(var x = 0; x <= requestCount; x++) {
      offset = x*1000;
      urls.push('http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=*&$where=unique_key > ' + lastUniqueKey + '&$offset=' + offset + '&$order=unique_key ASC');
    }
    console.log(urls);
    var promises = getPromises(urls);

    return Q.allSettled(promises).then(function (results) {
      return _.flatten(results, 'value');
    });
  } else {
    var url = 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=*&$where=unique_key > ' + lastUniqueKey + '&$order=unique_key ASC';
    request(url, function (error, response, body) {
      // console.log('request back');
      if(!error) {
        var newCrashes = JSON.parse(body);
        deferred.resolve(newCrashes);
      }
    });
  }
  return deferred.promise;
};

module.exports = {
  fetchAccidents:fetchAccidents,
  getBaseData:getBaseData,
  getNewCrashes:getNewCrashes,
  getCurrentViewInformation:getCurrentViewInformation
};
