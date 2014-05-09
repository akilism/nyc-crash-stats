'use strict';


var data_urls = require('./data_urls'),
    request = require('request'),
    Q = require('q'),
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    NodeCache = require( "node-cache" );

var dataCache = new NodeCache();
var readFile = Q.denodeify(fs.readFile);
var dataPath = path.normalize(__dirname + '/../data');
var file = 'cache.json';
var metadata;

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
