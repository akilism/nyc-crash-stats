'use strict';

directives.directive('statList', ['$location', function ($location) {
    return {
      templateUrl: 'partials/statlist.html',
      restrict: 'E',
      scope: {
        'stat': '=dataset'
      },
      link: function postLink(scope, element, attrs) {
      }
    };
  }]);
