'use strict';

directives.directive('areaDropdown', ['$location', function ($location) {
    return {
      templateUrl: 'partials/dropdown.html',
      restrict: 'E',
      scope: {
        'areas': '=dataset'
      },
      link: function postLink(scope, element, attrs) {
        scope.loadArea = function (area, $event) {
          console.log(area, $event);
          $location.path('/' + area.type + '/' + area.identifier);
          scope.toggleDropDown();
        };

        scope.toggleDropDown = function () {
          element.find('.dropdown-menu').toggleClass('show');
        };
      }
    };
  }]);
