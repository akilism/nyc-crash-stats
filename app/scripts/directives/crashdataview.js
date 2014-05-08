'use strict';

directives.directive('crashDataView', function () {
    return {
      templateUrl: 'partials/crashdataview.html',
      restrict: 'E',
      contoller: directives.crashDataView,
      scope: {
        dataset: '=dataset'
      },
      controllerAs: 'crashDataView',
      link: function postLink(scope, element, attrs) {
        //element.text('this is the crashDataView directive');
      }
    };
  });


directives.crashDataView = function ($scope, $element, $attrs, $http) {
  debugger;
  console.log('crashDataView', $scope);
};

directives.crashDataView.$inject = ['$scope', '$element', '$attrs', '$http'];
