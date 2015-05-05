'use strict';

var SOCRATA_API_URL = 'http://data.cityofnewyork.us/resource/h9gi-nx95.json';

var host = 'nycCrashStatsApp';

var dataMap = {
 'b': 'borough',
 'cfv1': 'contributing_factor_vehicle_1',
 'cfv2': 'contributing_factor_vehicle_2',
 'cfv3': 'contributing_factor_vehicle_3',
 'd': 'date',
 'lat': 'latitude',
 'lon': 'longitude',
 'loc': 'location',
 'nci': 'number_of_cyclist_injured',
 'nck': 'number_of_cyclist_killed',
 'nmi': 'number_of_motorist_injured',
 'nmk': 'number_of_motorist_killed',
 'nei': 'number_of_pedestrians_injured',
 'nek': 'number_of_pedestrians_killed',
 'npi': 'number_of_persons_injured',
 'npk': 'number_of_persons_killed',
 'offsn': 'off_street_name',
 'onsn': 'on_street_name',
 't': 'time',
 'uk': 'unique_key',
 'yr': 'year',
 'zp': 'zip_code'
};

var reMapKeys = function (data) {
  var mappedData;
  if(_.isArray(data)) {
    mappedData = _.map(data, function (val) {
      return reMapKeys(val);
    });
  } else {
    mappedData = {};

    _.forOwn(data, function (val, key) {
      if(_.isArray(val)) {
        val = reMapKeys(val);
      }

      if(dataMap[key]) {
        mappedData[dataMap[key]] = val;

        if (key === 'uk') {
          mappedData.unique_key = val;
        }
      } else {
        mappedData[key] = val;
      }
    });
  }

  return mappedData;
};

var getPath = function (path) {
  if (path === '/') { return '/api/base/'; }
  return '/api/' + path + '/';
};

var getFeatureUrl = function (options, type) {
};

var getDataWithOptions = function (options, type, $http, $q) {
  var deferred = $q.defer();

  var config = {
    method: 'GET',
    url: getPath(type),
    params: options
  };

  console.log(config);
  $http(config).success(function (data) {
            console.log('test');
      deferred.resolve(reMapKeys(data));
    }
  );

  return deferred.promise;
};

var getBaseData = function (path, $http, $q) {
  var deferred = $q.defer();
  var apiPath = getPath(path);

  var getDefer = function () { $http.get(apiPath).success(
    function(data) {
      deferred.resolve(reMapKeys(data));
    });

    return deferred.promise;
  };

  return getDefer();
};

services.factory('Socrata', ['$http', '$q', function ($http, $q) {
  return function (options, path) {
    if (options) {
      return getDataWithOptions(options, path, $http, $q);
    }

    return getBaseData(path, $http, $q);

  };
}]);
