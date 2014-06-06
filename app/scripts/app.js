'use strict';

angular.module('nycCrashStatsApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'nycCrashStatsApp.services',
  'nycCrashStatsApp.filters',
  'nycCrashStatsApp.directives'
  ])
.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
  $routeProvider
  .when('/', {
    templateUrl: 'partials/main',
    controller: 'MainCtrl',
    resolve: {
      crashStats: ['Socrata', '$location', function(Socrata, $location) {
        return Socrata(null, $location.$$path);
      }
    ]}
  })
  .when('/main', {
    templateUrl: 'partials/main',
    controller: 'MainCtrl',
    resolve: {
      crashStats: ['Socrata', '$location', function(Socrata, $location) {
        return Socrata(null, $location.$$path);
      }
    ]}
  })
  .when('/trends', {
    templateUrl: 'partials/trend',
    controller: 'TrendCtrl',
    resolve: {
      trendStats: ['Socrata', '$location', function(Socrata, $location) {
        return Socrata(null, 'daily');
      }
    ]}
  })
  .when('/zipcode/:zipcode', {
    templateUrl: 'partials/trend',
    controller: 'TrendCtrl',
    resolve: {
      trendStats: ['Socrata', '$location', function(Socrata, $location) {
        var options = {
          'type': 'zipcode',
          'value': getPathValue($location.$$path)
        };

        return Socrata(options, 'daily');
      }
    ]}
  })
  .when('/community/:cdid', {
    templateUrl: 'partials/trend',
    controller: 'TrendCtrl',
    resolve: {
      trendStats: ['Socrata', '$location', function(Socrata, $location) {
        var options = {
          'type': 'community',
          'value': getPathValue($location.$$path)
        };
        return Socrata(options, 'daily');
      }
    ]}
  })
  .when('/borough/:borough', {
    templateUrl: 'partials/trend',
    controller: 'TrendCtrl',
    resolve: {
      trendStats: ['Socrata', '$location', function(Socrata, $location) {
        var options = {
          'type': 'borough',
          'value': getPathValue($location.$$path)
        };
        return Socrata(options, 'daily');
      }
    ]}
  })
  .when('/citycouncil/:ccid', {
    templateUrl: 'partials/trend',
    controller: 'TrendCtrl',
    resolve: {
      trendStats: ['Socrata', '$location', function(Socrata, $location) {
        var options = {
          'type': 'citycouncil',
          'value': getPathValue($location.$$path)
        };
        return Socrata(options, 'daily');
      }
    ]}
  })
  .when('/neighborhood/:neighborhood', {
    templateUrl: 'partials/trend',
    controller: 'TrendCtrl',
    resolve: {
      trendStats: ['Socrata', '$location', function(Socrata, $location) {
        var options = {
          'type': 'neighborhood',
          'value': getPathValue($location.$$path)
        };
        return Socrata(options, 'daily');
      }
    ]}
  })
  .when('/precinct/:pcid', {
    templateUrl: 'partials/trend',
    controller: 'TrendCtrl',
    resolve: {
      trendStats: ['Socrata', '$location', function(Socrata, $location) {
        var options = {
          'type': 'precinct',
          'value': getPathValue($location.$$path)
        };
        return Socrata(options, 'daily');
      }
    ]}
  })
  .otherwise({
    redirectTo: '/'
  });
  $locationProvider.html5Mode(true);
}]);

var getPathValue = function(path) {
  //remove the trailing slash if there is one.
  path = (path.slice(-1) === '/') ? path.slice(path.length-1) : path;
  return path.slice(path.lastIndexOf('/')+1);
};

var directives = angular.module('nycCrashStatsApp.directives', []);
var services = angular.module('nycCrashStatsApp.services', []);
var filters = angular.module('nycCrashStatsApp.filters', []);
