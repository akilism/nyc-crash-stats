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

        scope.swapAccident = function (accidentId) {
          scope.showAccidentDetails(accidentId, false);
        };
      }
    };
  });
