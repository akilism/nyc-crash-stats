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
        // return Socrata(null, $location.$$path);
        var options = {
          'type': 'city',
          'value': 'city',
          'year': getTrendDate()
        };
        return Socrata(options, 'featureTotal');
      }
    ]}
  })
  .when('/main', {
    templateUrl: 'partials/main',
    controller: 'MainCtrl',
    resolve: {
      crashStats: ['Socrata', '$location', function(Socrata, $location) {
        // return Socrata(null, $location.$$path);
        var options = {
          'type': 'city',
          'value': 'city',
          'year': getTrendDate()
        };

        return Socrata(options, 'featureTotal');
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
    templateUrl: 'partials/main',
    controller: 'MainCtrl',
    resolve: {
      crashStats: ['Socrata', '$location', function(Socrata, $location) {
        var options = {
          'type': 'zipcode',
          'value': getPathValue($location.$$path),
          'year': getTrendDate()
        };

        return Socrata(options, 'featureTotal');
      }
    ]}
  })
  .when('/community/:cdid', {
    templateUrl: 'partials/main',
    controller: 'MainCtrl',
    resolve: {
      crashStats: ['Socrata', '$location', function(Socrata, $location) {
        var options = {
          'type': 'community',
          'value': getPathValue($location.$$path),
          'year': getTrendDate()
        };
        return Socrata(options, 'featureTotal');
      }
    ]}
  })
  .when('/borough/:borough', {
    templateUrl: 'partials/main',
    controller: 'MainCtrl',
    resolve: {
      crashStats: ['Socrata', '$location', function(Socrata, $location) {
        var options = {
          'type': 'borough',
          'value': getPathValue($location.$$path),
          'year': getTrendDate()
        };
        return Socrata(options, 'featureTotal');
      }
    ]}
  })
  .when('/citycouncil/:ccid', {
    templateUrl: 'partials/main',
    controller: 'MainCtrl',
    resolve: {
      crashStats: ['Socrata', '$location', function(Socrata, $location) {
        var options = {
          'type': 'citycouncil',
          'value': getPathValue($location.$$path),
          'year': getTrendDate()
        };
        return Socrata(options, 'featureTotal');
      }
    ]}
  })
  .when('/neighborhood/:neighborhood', {
    templateUrl: 'partials/main',
    controller: 'MainCtrl',
    resolve: {
      crashStats: ['Socrata', '$location', function(Socrata, $location) {
        var options = {
          'type': 'neighborhood',
          'value': getPathValue($location.$$path),
          'year': getTrendDate()
        };
        return Socrata(options, 'featureTotal');
      }
    ]}
  })
  .when('/precinct/:pcid', {
    templateUrl: 'partials/main',
    controller: 'MainCtrl',
    resolve: {
      crashStats: ['Socrata', '$location', function(Socrata, $location) {
        var options = {
          'type': 'precinct',
          'value': getPathValue($location.$$path),
          'year': getTrendDate()
        };
        return Socrata(options, 'featureTotal');
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

var getTrendDate = function() {
  return '2015-01-01';
};

var directives = angular.module('nycCrashStatsApp.directives', []);
var services = angular.module('nycCrashStatsApp.services', []);
var filters = angular.module('nycCrashStatsApp.filters', []);
