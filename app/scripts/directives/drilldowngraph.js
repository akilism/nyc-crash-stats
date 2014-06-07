'use strict';

directives.directive('drilldowngraph',['monthFilter', function (monthFilter) {
    return {
      templateUrl: 'partials/drilldowngraph.html',
      restrict: 'E',
      scope: {
        'dataset': '=dataset',
        'key': '=key',
        'title': '=header',
        'timeScale': '@timescale'
      },
      link: function postLink(scope, element, attrs) {
        var d = new Date();
        scope.month = d.getMonth();
        scope.year = d.getFullYear();
        scope.flatten = false;
        scope.years = [d.getFullYear()];

        var setGraph = function (data, key, flatten, scale, el) {
          var flatData = _.flatten(data);
          // console.log(flatData);
          scale = scale.toLowerCase();

          var domainMax = d3.max(flatData, function(d) {
            return parseInt(d.totals[key], 10);
          });

           var domainMin = d3.min(flatData, function(d) {
            return parseInt(d.totals[key], 10);
          });

          var dateMax = d3.max(flatData, function(d) { return d.date.getMonth(); });
          var dateMin = d3.min(flatData, function(d) { return d.date.getMonth(); });
          var lengthMax;

          if(scope.timeScale === 'monthly') {
            lengthMax = 12;
          } else if (scope.timeScale === 'daily') {
            lengthMax = d3.max(data, function (d) {
              return d.length;
            });
          }

          var margin = {top: 50, right: 0, bottom: 0, left: (domainMax > 999) ? 50 : 40};
          var width = 960 - margin.left - margin.right;
          var height = 350 - margin.top - margin.bottom;
          var count = flatData.length;
          var x = d3.scale.ordinal().rangeRoundBands([0, width], 0.1);
          var timeScale = (flatten) ? d3.time.scale().domain([dateMin, dateMax]).range([0, width]) : d3.scale.linear().domain([0, lengthMax]).range([0, width]);
          var totalScale = null;

          var setScaleRange = function(min, max) {
            domainMax = (domainMax < 10) ? 10 : domainMax;
            totalScale = d3.scale.linear().domain([0, domainMax]).nice();
            totalScale = totalScale.rangeRound([min, max]);
          };

          var numberFormatter = d3.format(',');

          setScaleRange(height - 10, 5);

          if(flatten) {
            x.domain(flatData.map(function(d) { return d.date; }));
          } else {
            x.domain([0, lengthMax]);
          }

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

          var xTickCount = (flatten) ? 8 : 12;

          var xAxis = (flatten) ? d3.svg.axis()
          .orient('top')
          .tickSize(height)
          .tickFormat(d3.time.format('%m/%y'))
          .ticks(xTickCount) : d3.svg.axis()
          .scale(timeScale)
          .orient('top')
          .tickSize(height)
          .tickFormat(function (d) {
            if (scale === 'daily') { return d; }
            return monthFilter(d);
          })
          .ticks(xTickCount);

          var xPos = function(d) {
            switch (scale) {
              case 'monthly':
                return (flatten) ? timeScale(d.date) : timeScale(d.date.getMonth());
              case 'daily':
                return (flatten) ? timeScale(d.date) : timeScale(d.date.getDate());
              case 'yearly':
                return (flatten) ? timeScale(d.date) : timeScale(d.date.getFullYear());
            }
          };

          var pathSegment = d3.svg.line()
          .x(xPos)
          .y(function(d) { return totalScale(d.totals[key]); })
          .interpolate('linear');

          var customAxis = function (g) {
            g.selectAll('text')
            .attr('x', '-2')
            .attr('dy', -4)
            .style('text-anchor', 'end');
          };

          var removeHover = function (d, i) {
            $('.crash-month-inner-line').remove();

            $('.crash-graph-hover').hide();

            var d3Target = d3.select(d3.event.target);
            d3Target.on('mouseout', null);
          };

          var showHover = function (d, i) {
            // console.log(d, i);
            var d3Target = d3.select(d3.event.target);
            var d3Parent = d3.select(d3.event.target.parentElement)
            var innerHorizLine = d3Parent.append('svg:line');
            var $$graphHover = $('.crash-graph-hover');
            var dateOptions = (scale === 'daily') ? {month: 'long', day: 'numeric', year: 'numeric'} : {month: 'long', year: 'numeric'};

            innerHorizLine.attr('x1', 0)
            .attr('y1', totalScale(d.totals[key]))
            .attr('x2', width)
            .attr('y2', totalScale(d.totals[key]))
            .attr('class','crash-month-inner-line');
            $$graphHover.find('.amount .hover-value').text(numberFormatter(d.totals[key]));
            $$graphHover.find('.date .hover-value').text(d.date.toLocaleDateString('en-us', dateOptions));
            $$graphHover.css({
              'top':  (d3.event.y + 20) + 'px',
              'left': d3.event.x + 'px'
            });
            $$graphHover.show();

            // d3Target.on('mouseover', null);
            d3Target.on('mouseout', removeHover);
          };

          var filterGraph = function (d, i) {
              clearKey();
              zoomGraph(d.date.getMonth(), d.date.getFullYear());
          };

          scope.xAxis = scope.xAxis || g.append('g').attr('class', 'x axis').attr('transform','translate(0, ' + (height-10) + ')');
          scope.yAxis = scope.yAxis || g.append('g').attr('class', 'y axis');

          scope.xAxis.call(xAxis)
          .selectAll('text')
          .attr('x', 5)
          .attr('y', 10)
          .style('text-anchor', 'start');

          scope.yAxis
          .call(yAxis)
          .attr('transform','translate(0, 0)')
          .call(customAxis);

          // console.log(g, flatData);
          var lineGraph = g.selectAll('path.crash-month-line')
          .data(flatData, function(d) {
            return (d) ? d.date.getDate() + '' + d.date.getMonth() + '' + d.date.getYear() + '' + key : null;
          });

          var lineGraphEnter = lineGraph.enter();

          if(flatten) {
            scope.path = scope.path || g.append('path');
            scope.path.attr('d', pathSegment(flatData))
            .attr('class', 'crash-month-line');
          } else {
            scope.paths = {};
            _.forEach(data, function (months) {
              // console.log(months);
              var year = months[0].date.getFullYear();
              scope.paths[year] = scope.paths[year] || g.append('path');
              scope.paths[year].attr('d', pathSegment(months))
              .attr('class', 'crash-month-line year-' + year);
              addKeyItem(months[0].date.getMonth(), year);
            });
          }

          g.selectAll('circle').remove();

          lineGraphEnter.append('svg:circle')
          .attr('cx', xPos)
          .attr('cy', function (d) { return totalScale(d.totals[key]); })
          .attr('r', 3)
          .attr('class', function (d) {
           return 'crash-month-point year-' + d.date.getFullYear();
          });

          lineGraphEnter.append('svg:circle')
          .attr('cx', xPos)
          .attr('cy', function (d) { return totalScale(d.totals[key]); })
          .attr('r', 8)
          .attr('class', function (d) {
            return 'crash-month-hover-point year-' + d.date.getFullYear();
          })
          .on('mousemove', showHover);
          //.on('click', filterGraph);


          // var lineGraphUpdate = lineGraph.transition();

          // lineGraphUpdate.attr('cx', xPos)
          // .attr('cy', function (d) { return totalScale(d.totals[key]); });

          // lineGraphUpdate.selectAll('.violation-month-line').attr('d', pathSegment(data));

          lineGraph.exit().remove();

          //move the domain to the back so we can fill it with a color.
          var $$xAxis = $(element).find('.x.axis');
          var $$xDomain = $$xAxis.children('.domain').detach();
          $$xDomain.prependTo($$xAxis);
          $$xDomain = null;
          $$xAxis = null;
        };

        var addKeyItem = function(month, year) {
          var $$key = element.find('.drill-down-key');
          var $$keyForYear = $$key.children('[year="' + year + '"]');
          if ($$keyForYear.length === 0) {
            $$key.append('<div year="' + year + '" class="key-item year-' + year + '"><hr>' + year + '</div>');
          }
        };

        var getMonthlyTotals = function (data, years) {
          var newData = [];
          // console.log(data, years);
          _.forEach(years, function (year) {
            if (data.hasOwnProperty(year)) {
              var yearData = [];
              _.forOwn(data[year].months, function (val, key) {
                // console.log(val.totals, val.date);
                yearData.push({'date': val.date, 'totals': val.totals});
              });
              newData.push(yearData);
            }
          });

          // console.log(totaledData);
          return newData;
        };

        var getDailyTotals = function (data, month, years) {
          var newData = [];
          _.forEach(years, function(year) {
            if (data.hasOwnProperty(year) && data[year].months.hasOwnProperty(month)) {
              var monthData = [];
              _.forOwn(data[year].months[month].days, function (val, key) {
                monthData.push({'date': val.date, 'totals': val.totals});
              });
              newData.push(monthData);
            }
          });

          return newData;
        };

        var getYearlyTotals = function (data) {

        };

        var setGraphData = function (data, scale) {
          scale = scale.toLowerCase();
          switch (scale) {
            case 'monthly':
              return getMonthlyTotals(data, scope.years);
            case 'yearly':
              return getYearlyTotals(data);
            case 'daily':
              return getDailyTotals(data, scope.month, scope.years);
          }
        };

        var graphData = setGraphData(scope.dataset, scope.timeScale);

        // console.log(scope.years);
        // console.log(scope.dataset);
        // console.log(scope.timeScale);
        var clearKey = function () {
          element.find('.drill-down-key').html('');
        };

        var zoomGraph = function (month, year) {
          scope.month = month;
          scope.year = year;
          scope.timeScale = (scope.timeScale.toLowerCase() === 'monthly') ? 'daily' : 'monthly';
          graphData = setGraphData(scope.dataset, scope.timeScale);
          setGraph(graphData, scope.key, scope.flatten, scope.timeScale, $(element).find('.drill-down-graph')[0]);
        };

        setGraph(graphData, scope.key, scope.flatten, scope.timeScale, $(element).find('.drill-down-graph')[0]);

        // scope.$watch('dataset', function (newVal, oldVal) {
        //   scope.years = _.keys(scope.dataset);
        //   graphData = setGraphData(scope.dataset, scope.timeScale);
        //   setGraph(graphData, scope.key, scope.flatten, scope.timeScale, $(element).find('.drill-down-graph')[0]);
        // }, true);

        scope.$on('updateGraph', function () {
          scope.years = _.keys(scope.dataset);
          graphData = setGraphData(scope.dataset, scope.timeScale);
          setGraph(graphData, scope.key, scope.flatten, scope.timeScale, $(element).find('.drill-down-graph')[0]);
        });

        scope.$watch('key', function (newVal, oldVal) {
          setGraph(graphData, scope.key, scope.flatten, scope.timeScale, $(element).find('.drill-down-graph')[0]);
        });
      }
    };
  }]);
