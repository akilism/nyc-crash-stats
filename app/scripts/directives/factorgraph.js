'use strict';

directives.directive('factorGraph', ['numberFilter', function (numberFilter) {
    return {
      templateUrl: 'partials/factorgraph.html',
      restrict: 'E',
      scope: {
        'dataset': '=dataset',
        'heading': '@heading',
        'factorListSize': '=size',
        'getFactorClass': '=classer'
      },
      link: function postLink(scope, element, attrs) {
        scope.lockedFactors = [];
        scope.timeoutId;

        // Get the css class for the factor.
        scope.factorClass = function (factor) {
          return scope.getFactorClass(factor);
        };

        scope.$watch('dataset', function () {
          scope.lockedFactors = [];
          $('.accident-path').css({'display': ''});
          $('.factor-selector-item').removeClass('active');
        });

        //Show relevant accidents on the map.
        scope.factorHover = function ($event) {
          //console.log(scope.dataset);

          if(scope.lockedFactors.length === 0) {
            var $$factorKey = $($event.currentTarget).find('.factor-key');
            if($$factorKey.length > 0) {
              var factor = $$factorKey[0].classList[0];

              $('.accident-path').not('.' + factor).css({'display': 'none'});
              $('.accident-path.' + factor).css({'display': ''});
            }
          }

          var factorText = $($event.target).attr('factor');

          if (factorText) { factorText = factorText.trim(); }

          if (factorText === 'Blank') { factorText = undefined; }

          var currFactor = _.find(scope.dataset, function (facObj) {
            return facObj.factor === factorText;
          });

          var pos = { 'x': $event.pageX, 'y': $event.pageY };

          if(currFactor) { showToolTip(currFactor.total_accidents, pos); }
        };

        scope.factorOut = function () {
          if(scope.lockedFactors.length === 0) {
            $('.accident-path').css({'display': ''});
          }

          hideToolTip();
        };

        // Lock this factor to show on the map.
        scope.lockFactor = function ($event) {
          var $$target = $($event.currentTarget);
          var $$paths = $('.accident-path');
          var $$factorKey = $($event.currentTarget).find('.factor-key');
          var factor = '';

          if($$factorKey.length > 0) {
            factor = $$factorKey[0].classList[0];
          }

          if($$target.hasClass('active')) {
            $$target.removeClass('active');
            $$paths.filter('.' + factor).css({'display': 'none'});

            dropFactor(factor);

            if(scope.lockedFactors.length === 0) {
              $$paths.css({'display': ''});
            }

            return false;
          }

          $$target.addClass('active');

          if(scope.lockedFactors.length === 0) {
            $$paths.not('.' + factor).css({'display': 'none'});
          }

          ga('send', 'event', 'click', 'factor', factor);
          $$paths.filter('.' + factor).css({'display': ''});
          scope.lockedFactors.push(factor);
        };

        // Show the factor accident count tooltip.
        var showToolTip = function (total, pos) {
          var content = (total > 1) ? total + ' Crashes': total + ' Crash';
          $('.map-tooltip').html(content).css({
            'left': (pos.x + 15) + 'px',
            'top': (pos.y - 10) + 'px'
          }).show();

          if (scope.timeoutId) {
            window.clearTimeout(scope.timeoutId);
          }

          scope.timeoutId = window.setTimeout(hideToolTip, 1500);
        };

        // Handle the toggle for accidents / deaths / both.
        scope.displayAccidentType = function ($event, type) {

          $('.type-selector li').removeClass('active');

          //Unfilter.
          if(scope.accidentFilterType === type) {
                $('.crash-data-view-map').removeClass('only-injury').removeClass('only-death');
                scope.accidentFilterType = '';
                return;
          } else {
            scope.accidentFilterType = type;
            $($event.target).addClass('active');
          }

          switch(type) {
            case 'death':
              $('.crash-data-view-map').removeClass('only-injury').addClass('only-death');
              break;
            case 'injury':
              $('.crash-data-view-map').removeClass('only-death').addClass('only-injury');
              break;
          }
        };

        var hideToolTip = function () {
          $('.map-tooltip').hide();
        };

        // Remove the factor from the set of locked in factors.
        var dropFactor = function (factor) {
          _.remove(scope.lockedFactors, function (lockedFactor) {
            return factor === lockedFactor;
          });
        };
      }
    };
  }]);
