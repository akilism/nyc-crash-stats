'use strict';

directives.directive('statGroup', ['$location', function ($location) {
    return {
      templateUrl: 'partials/statgroup.html',
      restrict: 'E',
      scope: {
        'stat': '=dataset',
        'type': '@',
        'itemClickHandler': '=itemclick'
      },
      link: function postLink(scope, element, attrs) {
      }
    };
  }]);
