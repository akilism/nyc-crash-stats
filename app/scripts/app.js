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
  .otherwise({
    redirectTo: '/'
  });
  $locationProvider.html5Mode(true);
}]);

var directives = angular.module('nycCrashStatsApp.directives', []);
var services = angular.module('nycCrashStatsApp.services', []);
var filters = angular.module('nycCrashStatsApp.filters', []);
