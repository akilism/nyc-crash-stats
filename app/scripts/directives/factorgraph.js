'use strict';

angular.module('nycCrashStatsApp')
  .directive('factorGraph', ['numberFilter', function (numberFilter) {
    return {
      templateUrl: 'partials/factorgraph.html',
      restrict: 'E',
      scope: {
        'dataset': '=dataset',
        'heading': '@heading'
      },
      link: function postLink(scope, element, attrs) {

        // scope.dataset = scope.dataset.slice(0, 11);
        scope.factors = scope.dataset.slice(1, 6);

        scope.unspecified = function () {
          var factor = _.find(scope.dataset, function (factor) {
            if(factor.factor === "Unspecified") {
              return true;
            }

            return false;
          });

          return numberFilter(factor.total_accidents) + ' Accidents with ' + factor.factor + ' Contributing Factors.';
        };

        var setGraph = function (data){

          var domainMax = d3.max(data, function(d) {
            return parseInt(d.total_accidents, 10);
          });

          var domainMin = d3.min(data, function(d) {
            return parseInt(d.total_accidents, 10);
          });

          var totalScale;

          var setScaleRange = function(min, max) {
            totalScale = d3.scale.linear().domain([domainMin, domainMax]);
            totalScale = totalScale.rangeRound([min, max]);
          };

          setScaleRange(1, 100);

          var bar = d3.select(element.find('.factor-graph')[0]).selectAll('.factor-graph-item')
            .data(data, function(d) {
                return d.factor;
            });

          var barEnter = bar.enter();

          barEnter.append('li').attr('class', 'factor-graph-item')
          .append('div').attr('class', 'factor-bar')
          .style('width', function (d) {
            return totalScale(d.total_accidents) + '%';
          })
          .text(function (d) {
            var factor = (d.factor) ? d.factor : 'Blank';
            return factor + ' ' + d.total_accidents;
          });

          var barUpdate = bar.transition().style('width', function (d) {
            return totalScale(d.total_accidents) + '%';
          });

          bar.exit().remove();

        };


        scope.showAll = function ($event) {
          if (scope.factors.length > 10) {
            scope.factors = scope.dataset.slice(1, 6);
            element.find('.view-all-factors').text('View all Contributing Factors...');
          } else {
            scope.factors = scope.dataset.slice(1, scope.dataset.length);
            element.find('.view-all-factors').text('Hide...');
          }

          // var buttonText = element.find('.factor-graph-show-all').text();
          // if(buttonText === 'Hide') {
          //   element.find('.factor-graph-show-all').text('Show All');
          //   setGraph(scope.dataset.slice(1, 11));
          // } else {
          //   element.find('.factor-graph-show-all').text('Hide');
          //   setGraph(scope.dataset.slice(1, scope.dataset.length));
          // }
        };

        // setGraph(scope.dataset.slice(1, 11));
      }
    };
  }]);
