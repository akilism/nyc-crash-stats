'use strict';

var host = 'nycCrashStatsApp';

var getGeoData = function (path, $http, $q) {
  var deferred = $q.defer();
  var apiPath = '/api/geo' + path;

  var getDefer = function () { $http.get(apiPath).success(
    function(data) {
      deferred.resolve(data);
    });

    return deferred.promise;
  };

  return getDefer();
};


services.factory('GeoData', ['$http', '$q', function ($http, $q) {
  return function (path) {
    if (path) {
      return getGeoData(path, $http, $q);
    }
  };
}]);
