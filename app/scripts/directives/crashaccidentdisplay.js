'use strict';

directives.directive('crashAccidentDisplay', function () {
    return {
      templateUrl: 'partials/crashaccidentdisplay.html',
      restrict: 'E',
      contoller: directives.crashAccidentDisplay,
      scope: {
        crashData: '=crashdata'
      },
      controllerAs: 'crashAccidentDisplay',
      link: function postLink(scope, element, attrs) {
        //element.text('this is the crashAccidentDisplay directive');
      }
    };
  });


directives.crashAccidentDisplay = function ($scope, $element, $attrs, $http) {
  console.log($scope, $element, $attrs, $http);
};

//directives.crashAccidentDisplay.$inject = ['$scope', '$element', '$attrs', '$http'];
