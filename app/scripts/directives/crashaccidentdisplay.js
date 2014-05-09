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
        scope.crashData.class = 'accident-' + scope.crashData.unique_key;

        //Trigger deatailed view.
        scope.showAccidentDetails = function ($event) {
          // var $$currentTarget = $($event.currentTarget);
          // var className = '.accident-' + $$currentTarget.attr('accident-id');
          // console.log(className, $('path' + className));
        };

        var onMouseOver = function (event) {
          var $$currentTarget = $(event.currentTarget);
          var className = '.accident-' + $$currentTarget.attr('accident-id');

          $(className).each(function () {
            this.classList.add('hover-accident');
          });

          $$currentTarget.on('mouseout', onMouseOut);
          $$currentTarget.off('mouseover', onMouseOver);
        };

        var onMouseOut = function (event) {
          var $$currentTarget = $(event.currentTarget);
          var className = '.accident-' + $$currentTarget.attr('accident-id');

          $(className).each(function () {
            this.classList.remove('hover-accident');
          });

          $$currentTarget.off('mouseout', onMouseOut);
          $$currentTarget.on('mouseover', onMouseOver);
        };

        $(element).children('.accident-display').on('mouseover', onMouseOver);
      }
    };
  });


directives.crashAccidentDisplay = function ($scope, $element, $attrs, $http) {

};

directives.crashAccidentDisplay.$inject = ['$scope', '$element', '$attrs', '$http'];
