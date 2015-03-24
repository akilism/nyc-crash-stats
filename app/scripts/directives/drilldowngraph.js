'use strict';

directives.directive('drilldowngraph',['monthFilter', function (monthFilter) {
    return {
      templateUrl: 'partials/drilldowngraph.html',
      restrict: 'E',
      scope: {
        'dataset': '='
      },
      link: function postLink(scope, element, attrs) {
        var d = new Date();
        scope.month = d.getMonth();
        scope.year = d.getFullYear();
        scope.flatten = false;
        scope.years = [d.getFullYear()];

        var getGraphHeight = function (margin) {
          var width = (window.innerWidth/2 > 640) ? Math.round(window.innerWidth/2) : 640;

          if(window.innerWidth > 1680) {
            width = Math.round(window.innerWidth*0.50);
          } else if(window.innerWidth > 1280) {
            width = Math.round(window.innerWidth*0.55);
          } else if(window.innerWidth > 1024) {
            width = Math.round(window.innerWidth*0.65);
          } else if(window.innerWidth > 800) {
            width = Math.round(window.innerWidth*0.75);
          } else {
            width = 640;
          }
          // console.log(window.innerWidth, width);
          $('.stat-graph').css({
            width : width + margin.left + margin.right,
            height: Math.round(width/2) + margin.top + margin.bottom + 100
          });
          return width - margin.left - margin.right;
        };

        var setGraph = function (data, el) {

          var arrData = _.flatten(_.reduce(data, function(acc, v, k) {
            return acc.concat(_.reduce(v, function(mAcc, mv, mk) {
              if(mk === 'totals') {
                var mTtl = _.map(mv, function(tv, tk) {
                  return tv;
                });
                mAcc.push(mTtl);
              } else {
                mAcc.push(0);
              }
              return mAcc;
            }, [])); //mAcc
          }, [])); //acc

          var groupedByDate = _.map(data, function(v, k) {
            return {
              date: new Date(v.year, v.month),
              totals: _.map(v.totals, function(tv, tk) {
                return {
                  'name': tk,
                  'count': tv
                };
              }),
              key: k
            };
          });

          // console.log('groupedByDate', groupedByDate);

          var domainMax = d3.max(arrData),
            domainMin = d3.min(arrData),
            dateMax = d3.max(groupedByDate, function(d) { return d.date.getMonth(); }),
            dateMin = d3.min(groupedByDate, function(d) { return d.date.getMonth(); }),
            lengthMax = 12,
            margin = {top: 20, right: 0, bottom: 0, left: (domainMax > 999) ? 50 : 40},
            width = getGraphHeight(margin),
            height = Math.round(width/2) - margin.top - margin.bottom,
            count = data.length,
            x = d3.scale.ordinal().rangeRoundBands([0, width], 0.1),
            timeScale = d3.scale.linear().domain([0, lengthMax]).range([0, width]),
            totalScale = null;
          // var timeScale = (flatten) ? d3.time.scale().domain([dateMin, dateMax]).range([0, width]) : d3.scale.linear().domain([0, lengthMax]).range([0, width]);

          var setScaleRange = function(min, max) {
            domainMax = (domainMax < 10) ? 10 : domainMax;
            totalScale = d3.scale.linear().domain([0, domainMax]).nice();
            totalScale = totalScale.rangeRound([min, max]);
          };

          var numberFormatter = d3.format(',');

          setScaleRange(height - 10, 5);
          x.domain([0, lengthMax]);

          scope.svg = scope.svg || d3.select(el).append('svg');
          scope.g = scope.g || scope.svg.append('g');

          var svg = scope.svg;
          var g = scope.g;

          svg.attr('width', width + margin.left + margin.right + 6)
          .attr('height', height + margin.top + margin.bottom + 6);

          g.attr('transform','translate(' + margin.left + ',' + margin.top + ')');

          var yAxis = d3.svg.axis()
          .scale(totalScale)
          .orient('right')
          .tickSize(width, 1)
          .tickPadding(5)
          .tickFormat(numberFormatter)
          .ticks(10);

          var xTickCount = 12;

          var xAxis = d3.svg.axis()
          .scale(timeScale)
          .orient('top')
          .tickSize(height)
          .tickFormat(function (d) {
            return monthFilter(d);
          })
          .ticks(xTickCount);

          var xPos = function(d) { return timeScale(d.date.getMonth()); };

          var yPos = function(d) { return totalScale(d.totals[0].count); };

          var pathSegment = d3.svg.line()
          .x(xPos)
          .y(yPos)
          .interpolate('linear');

          var customAxis = function (g) {
            g.selectAll('text')
            .attr('x', '-2')
            .attr('dy', -4)
            .style('text-anchor', ' end');
          };

          scope.xAxis = scope.xAxis || g.append('g').attr('class', 'x axis').attr('transform','translate(0, ' + (height-10) + ')');
          scope.yAxis = scope.yAxis || g.append('g').attr('class', 'y axis');

          scope.xAxis
          .call(xAxis)
          .selectAll('text')
          .attr('x', 5)
          .attr('y', 10)
          .style('text-anchor', 'start');

          scope.yAxis
          .call(yAxis)
          .attr('transform','translate(0, 0)')
          .call(customAxis);

          var lineGraph = g.selectAll('path.crash-month-line')
          .data(groupedByDate, function(d) {
            return (d) ? d.key : null;
          });

          var lineGraphEnter = lineGraph.enter();

          var distinctYears = _.reduce(groupedByDate, function(acc, v, k) {
            if(acc.indexOf(v.date.getFullYear()) === -1) {
              acc.push(v.date.getFullYear());
            }
            return acc;
          }, []);

          var getYearTotal = function(data, year) {
            return _.filter(data, function(v, k) {
              return v.date.getFullYear() === year;
            }).sort(function(a, b) {
              return a.date.getMonth()  - b.date.getMonth();
            });
          };

          var removeHover = function (d, i) {
            $('.crash-month-inner-line').remove();

            $('.crash-graph-hover').hide();

            var d3Target = d3.select(d3.event.target);
            d3Target.on('mouseout', null);
          };

          var showHover = function (d, i) {
            var d3Target = d3.select(d3.event.target);
            var d3Parent = d3.select(d3.event.target.parentElement);
            var $$graphHover = $('.crash-graph-hover');
            var dateOptions = {month: 'long', year: 'numeric'};
            $$graphHover.find('.amount .hover-value').text(numberFormatter(d.totals[0].count));
            $$graphHover.find('.date .hover-value').text(d.date.toLocaleDateString('en-us', dateOptions));
            $$graphHover.css({
              'top':  (d3.event.y + 20) + 'px',
              'left': d3.event.x + 'px'
            });
            $$graphHover.show();

            d3Target.on('mouseout', removeHover);
          };

          scope.paths = {};
          _.forEach(distinctYears, function(year) {
            scope.paths[year] = scope.paths[year] || g.append('path');
            scope.paths[year].attr('d', pathSegment(getYearTotal(groupedByDate, year)))
            .attr('class', 'crash-month-line year-' + year);
            addKeyItem(year);
          });

          // console.log(scope.paths);

          g.selectAll('circle').remove();

          lineGraphEnter.append('svg:circle')
          .attr('cx', xPos)
          .attr('cy', function (d) { return totalScale(d.totals[0].count); })
          .attr('r', 3)
          .attr('class', function (d) {
           return 'crash-month-point year-' + d.date.getFullYear();
          });

          lineGraphEnter.append('svg:circle')
          .attr('cx', xPos)
          .attr('cy', function (d) { return totalScale(d.totals[0].count); })
          .attr('r', 8)
          .attr('class', function (d) {
            return 'crash-month-hover-point year-' + d.date.getFullYear();
          })
          .on('mousemove', showHover);

          lineGraph.exit().remove();

          //move the domain to the back so we can fill it with a color.
          var $$xAxis = $(element).find('.x.axis');
          var $$xDomain = $$xAxis.children('.domain').detach();
          $$xDomain.prependTo($$xAxis);
          $$xDomain = null;
          $$xAxis = null;
        };

        var addKeyItem = function(year) {
          var $$key = element.find('.drill-down-key');
          var $$keyForYear = $$key.children('[year="' + year + '"]');
          if ($$keyForYear.length === 0) {
            $$key.append('<div year="' + year + '" class="key-item year-' + year + '"><hr>' + year + '</div>');
          }
        };

        var clearKey = function () {
          element.find('.drill-down-key').html('');
        };

        if(!_.isEmpty(scope.dataset)) {
          setGraph(scope.dataset, $(element).find('.drill-down-graph')[0]);
        }

        var hideGraph = function(evt) {
          $('.stat-graph').removeClass('showy');
          $('.stat-graph').off('click', hideGraph);
        };

        scope.$watch('dataset', function (newVal, oldVal) {
          if(!_.isEmpty(scope.dataset)) {
            var keys = _.keys(scope.dataset);
            var title = _.keys(scope.dataset[keys[0]].totals);
            scope.title = title[0];
            setGraph(scope.dataset, $(element).find('.drill-down-graph')[0]);
            $('.stat-graph').addClass('showy');
            $('.stat-graph').on('click', hideGraph);
          }
        });
      }
    };
  }]);
