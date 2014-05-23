'use strict';


directives.directive('crashPopup', function () {
    return {
      templateUrl: 'partials/crashpopup.html',
      restrict: 'E',
      // controller: directives.crashPopup,
      link: function postLink(scope, element, attrs) {
        console.log(scope);
      }
    };
  });


// directives.crashPopup = function ($scope, $element, $attrs, $http) {
//   console.log($scope.popup);
// };

// directives.crashPopup.$inject = ['$scope', '$element', '$attrs', '$http'];
