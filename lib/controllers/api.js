'use strict';


var data_urls = require('./data_urls'),
    //dataRedis = require('./data_redis'),
    dataSocrata = require('./data_socrata'),
    dataFile = require('./data_file'),
    dataMongo = require('./data_mongo'),
    csvLoader = require('./csv_loader'),
    Q = require('q'),
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    NodeCache = require( 'node-cache' ),
    gju = require('geojson-utils');

var dataCache = new NodeCache();
var getCache = Q.denodeify(dataCache.get);
var dataPath = path.normalize(__dirname + '/../data');
var file = 'cache.json';
var metadata;
var useSocrata = false;

// Return a local file as the response.
var sendFile = function (path, res) {
  dataFile.sendFile(path).then(function (fileContents) {
    res.send(JSON.parse(fileContents));
  });
};

// Cache the base data so we aren't always making the initial Socrata call.
var saveData = function (data, key) {
  console.log('saving data', key);
  var dataToCache = {
    'data': data,
    'updatedTime': (metadata) ? metadata.rowsUpdatedAt : null
  };

  var isSet = dataCache.set(key, dataToCache);
};

// Get the base data. Makes a number of API calls to get the relevant data.
var getDataNew = function (urls, res) {
  dataSocrata.getBaseData().then(function (data) {
    saveData(data, 'crashData');
    res.json(data);
  });
};

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

// //load all geojson shape files.
var getAllGeoFiles = function (res) {
  var files = ['citycouncil', 'community', 'neighborhood', 'precinct', 'zipcode'],
    data = [],
    promises = _.map(files, function (file) {
      return dataFile.getShapeFile(file, null);
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


var fetchAccidents = function (type, identifier, year, res) {
  // var key = dataRedis.getKey(type, identifier, year);
  dataSocrata.fetchAccidents(type, identifier, year).then(function (accidents) {
    // dataRedis.setCachedData(key, JSON.stringify(accidents)).then(function (reply) {
    //   console.log('redis reply : ', reply);
    // }).fail(function (error) {
    //   console.error('redis error : ' + error);
    // });

    if (res) {
      res.send(accidents);
    }
  });
};

// var sendCachedAccidents = function (key, res) {
//   dataRedis.getCachedData(key)
//   .then(function (cachedValue) {
//     var cachedAccidents = JSON.parse(cachedValue);
//     res.send(cachedAccidents);
//   });
// };

// return all the accidents for a specific area.
var getShapeDaily = function (req, res) {
  var type = req.query.type.toLowerCase(),
    identifier = req.query.value.toLowerCase(),
    year = req.query.year,
    // key = dataRedis.getKey(type, identifier, year),
    cachedAccidents;

    console.log(type, identifier, year);

  if(useSocrata) {
    fetchAccidents(type, identifier, year, res);
  } else {
    // TODO : mongo call.
    dataMongo.fetchAccidents(type, identifier, year).then(function (data) {
      console.log('res data', data.accidents.length);
      res.send(data);

    });
  }
  // dataRedis.useRedisCache(key)
  // .then(function (useCache) {
  //   if(useCache.fromCache && !useCache.fetch) {
  //     sendCachedAccidents(key, res);
  //   } else if (useCache.fromCache && useCache.fetch) {
  //     sendCachedAccidents(key, res);
  //     fetchAccidents(type, identifier, year);
  //   } else {
  //     fetchAccidents(type, identifier, year, res);
  //   }
  // });
};

var getCityDaily = function (req, res) {
  if (useSocrata) {
    dataSocrata.getCityDaily().then(function (rawData) {
      res.send(rawData);
    });
  } else {
    // TODO : mongo call.
  }
};


// var refreshCrashes = function (lastUniqueKey) {
//   //call socrata api for view.
//   return dataSocrata.getCurrentViewInformation(lastUniqueKey).then(function (socrataLatestKey) {
//     console.log(lastUniqueKey, socrataLatestKey);
//     if(socrataLatestKey > lastUniqueKey) {
//       return dataSocrata.getNewCrashes(lastUniqueKey, socrataLatestKey);
//     } else {
//       return [];
//     }
//   }).then(function (newCrashes) {
//     if(newCrashes.length === 0) { return; }

//     console.log('new crashes', newCrashes.length);
//     //Save new crashes to mongo db.
//     var crashes = _.sortBy(newCrashes, function (crash) {
//       return crash.unique_key;
//     });
//     var newLastKey = crashes[crashes.length-1].unique_key;
//     console.log('newLastKey:', newLastKey);

//     dataMongo.addCrashes(crashes, 'crashes');
//     fetchFromMongo().then(function (data) {
//       saveData(data, 'crashData');
//     });
//   }).catch(function (err) {
//     console.error(err);
//   });
// };

var fetchFromMongo = function () {
  console.log('fetching...', new Date());
  var today = new Date();
  var crashDate = new Date(today.getFullYear(), 0, 1);
  var totalDate = {
    'start': new Date(today.getFullYear(), 0 , 1),
    'end': today
  };
  var collection = 'crashes';
  var data = {};
  var totalAccidents, newLastKey;
  var promises = [
    dataMongo.getDateRangeTotals(collection, totalDate.start, totalDate.end, true),
    dataMongo.fetchCrashes(collection, {'date' : {$gte: crashDate}}, {'limit': 1000, 'sort': {'date': -1}})
  ];

  return Q.allSettled(promises).then(function (results) {
    // console.log('results', results);
    _.forEach(results, function(result, i) {
      if (_.isArray(result.value)) {
        data.yearly = [result.value[0].value];
        data.lastInjuries = {};
        data.lastInjuries.length = result.value[0].value.number_of_persons_injured;
        data.lastDeaths = {};
        data.lastDeaths.length = result.value[0].value.number_of_persons_killed;
      } else {
        // console.log('result', result.value.lastKey);
        data.lastAccidents = result.value.crashes;
        totalAccidents = result.value.total_accidents;
        newLastKey = result.value.lastKey;
        data.lastInsertedUniqueKey = result.value.lastKey;
      }
    });

    return data;
  });
};

var refreshCrashes = function () {
  console.log('refreshing:', new Date());
  csvLoader.refreshCrashes().then(function (result) {
    console.log('refreshing completed:', new Date() );
    //console.log('refresh result', result);
  });
};

/**
 * Get the base data set. it's updated daily from the socrata api with these calls.
 */
exports.baseData = function (req, res) {
  dataCache.get('crashData', function (err, cachedData) {
    // console.log('dataCache');
    if(cachedData.crashData && cachedData.crashData.hasOwnProperty('data')) {
      //return all accidents in the past 30 days instead of last 1000.
      //if there's cachedData then use it. If not query the database.
      //always make an api call to see if the dataset has updated.
      //if it has updated request new crashes and import into mongo database.
      //do this after sending the request.
      res.json(cachedData.crashData.data);
      var lastKey = parseInt(cachedData.crashData.data.lastInsertedUniqueKey, 10);
      console.log('lastkey:', lastKey);
      //refreshCrashes(lastKey);
    } else {
      if(useSocrata) {
        // console.log('useSocrata');
        //Limited to last 1000.
        dataSocrata.getBaseData().then(function (data) {
          res.send(data);
        });
      } else {
        // console.log('fetchFromMongo');
        // gets last 2000 accidents from mongodb.
        fetchFromMongo().then(function (data) {
          console.log('sending....', new Date());
          saveData(data, 'crashData');
          res.send(data);
        });
      }
    }
  });
};


// Return all accidents for a bounding box.
exports.feature = function (req, res) {
  getShapeDaily(req, res);
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

exports.refresh = function (req, res) {
  if(req.query.p === process.env.REFRESHPASS) {
   refreshCrashes();
   // res.send('refreshing');
  } else {
    console.log('wrong pass:', req.query);
    // res.send('attempting refresh');
  }
};
