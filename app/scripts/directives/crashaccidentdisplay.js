'use strict';


directives.directive('crashAccidentDisplay', function () {
    return {
      templateUrl: 'partials/crashaccidentdisplay.html',
      restrict: 'E',
      scope: {
        crashData: '=crashdata'
      },
      link: function postLink(scope, element, attrs) {
        scope.crashData.class = 'accident-' + scope.crashData.unique_key;

        scope.displayCount = function (value) {
          if(value && value > 0) {
            return true;
          }

          return false;
        };

        //Trigger detailed view.
        scope.showAccidentDetails = function (unique_key) {
          var $$detailView = $('.accident-detail-' + unique_key);
          $$detailView.toggleClass('vanish');
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
