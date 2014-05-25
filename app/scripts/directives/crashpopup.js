'use strict';


directives.directive('crashPopup', function () {
    return {
      templateUrl: 'partials/crashpopup.html',
      restrict: 'E',
      // controller: directives.crashPopup,
      link: function postLink(scope, element, attrs) {
        element.find('.btn-danger').on('click', function () {
          $('.accident-popup').hide();
        });
      }
    };
  });


// directives.crashPopup = function ($scope, $element, $attrs, $http) {
//   console.log($scope.popup);
// };

// directives.crashPopup.$inject = ['$scope', '$element', '$attrs', '$http'];
