'use strict';

angular.module('nycCrashStatsApp')
  .controller('NavbarCtrl', ['$scope', '$location', function ($scope, $location) {
    $scope.menu = [{
      'title': 'Home',
      'link': '/'
    }];

    $scope.isActive = function(route) {
      return route === $location.path();
    };
  }]);
