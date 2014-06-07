'use strict';

directives.directive('buttonDropdown', ['$location', function ($location) {
    return {
      templateUrl: 'partials/buttondropdown.html',
      restrict: 'E',
      scope: {
        'data': '=dataset'
      },
      link: function postLink(scope, element, attrs) {

        // scope.$watch('menuData', function (oldVal, newVal) {
        //   scope.data = newVal;
        // });

        scope.loadArea = function (area, $event) {
          $event.preventDefault();
          $location.path('/' + area.type + '/' + area.identifier);
          scope.hideDropDown();
        };

        scope.hideDropDown = function () {
          element.find('.dropdown-menu').removeClass('show');
        };

        //parenttype is optional.
        scope.openDropDown = function (type, level, isLeaf, $event, parentType) {
          $event.preventDefault();
          var $$target = $($event.target);
          var $$dropdown;

          $('.dropdown-menu a').removeClass('active');
          if(element.find('.dropdown-menu.' + type + '.' + level).hasClass('show')) {
            element.find('.dropdown-menu.' + level).removeClass('show flip');
          } else {
            element.find('.dropdown-menu.' + level).removeClass('show flip');
            if (parentType) {
              $$target.addClass('active');
              $$dropdown = element.find('.dropdown-menu.' + type + '.' + level + '.' + parentType);
              $$dropdown.toggleClass('show');
              if($$dropdown.width() + $$dropdown.offset().left > $(window).width()) {
                $$dropdown.toggleClass('flip');
              }
            } else {
              $$dropdown = element.find('.dropdown-menu.' + type + '.' + level);
              $$dropdown.toggleClass('show');
              if($$dropdown.width() + $$dropdown.offset().left > $(window).width()) {
                $$dropdown.toggleClass('flip');
              }
            }
          }
        };
      }
    };
  }]);
