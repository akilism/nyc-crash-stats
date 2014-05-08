'use strict';


var data_urls = require('./data_urls'),
    request = require('request'),
    Q = require('q'),
    _ = require('lodash');

var connectSocrata = function (url) {
  console.log('connectSocrata');
  var deferred = Q.defer();

  request(url, function (error, response, body) {
    if (!error) {
      deferred.resolve(JSON.parse(body));
    } else {
      deferred.reject(error);
    }
  });

  return deferred.promise;
};


//TODO persist data to disk and only refresh when socrata dataset is updated.  Run query to check last update date.
var getData = function (urls, res) {
  var data = {};
  var promises = [];

  _.forEach(urls, function (url) {
    promises.push(connectSocrata(url.url));
  });

  Q.allSettled(promises).then(function (results) {
    _.forEach(results, function(result, i) {
      console.log(result);

      data[urls[i].saveKey] = result.value;
    });

    res.json(data);
  });

};


/**
 * Get the base data set. it's updated daily from the socrata api with these calls.
 */
exports.baseData = function (req, res) {
  console.log('baseData');
  getData(data_urls.url, res);
};
