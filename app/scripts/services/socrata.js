'use strict';

var SOCRATA_API_URL = 'http://data.cityofnewyork.us/resource/h9gi-nx95.json';

var host = 'nycCrashStatsApp';

var getPath = function (path) {
  if (path === '/') { return '/api/base/'; }
  return '/api' + path;
};


// var getStoredDataset = function () {
//   return (localStorage[host]) ? JSON.parse(localStorage[host]) : null;
// };


var getDataWithOptions = function (options) {
  var url = SOCRATA_API_URL + '?';

  _.forEach(options, function (option) {
    //add in options
  });
};


var getBaseData = function (path, $http, $q) {
  var deferred = $q.defer();
  var apiPath = getPath(path);

  var getDefer = function () { $http.get(apiPath).success(
    function(data) {
      deferred.resolve(data);
    });

    return deferred.promise;
  };

  return getDefer();
};


services.factory('Socrata', function ($http, $q) {
  return function (options, path) {
    if (options) {
      return getDataWithOptions(options, $http);
    }

    return getBaseData(path, $http, $q);

  };
});
