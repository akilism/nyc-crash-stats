'use strict';

directives.directive('statGroup', ['$location', function ($location) {
    return {
      templateUrl: 'partials/statgroup.html',
      restrict: 'E',
      scope: {
        'stat': '=dataset'
      },
      link: function postLink(scope, element, attrs) {
      }
    };
  }]);
