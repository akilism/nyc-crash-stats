'use strict';

directives.directive('monthGraph', function () {
    return {
      templateUrl: 'partials/monthgraph.html',
      restrict: 'E',
      scope: {
        'dataset': '=dataset',
        'key': '@key',
        'title': '@header',
        'compress': '=compress'
      },
      link: function postLink(scope, element, attrs) {

        var setGraph = function (data, key, el) {

          var domainMax = d3.max(data, function(d) {
            return d[key];
          });

           var domainMin = d3.min(data, function(d) {
            return d[key];
          });

          var dateMax = d3.max(data, function(d) { return d.date; });
          var dateMin = d3.min(data, function(d) { return d.date; });
          var margin = {top: 50, right: 0, bottom: 0, left: (domainMax > 999) ? 50 : 40};
          var width = 960 - margin.left - margin.right;
          var height = 350 - margin.top - margin.bottom;
          var count = data.length;
          var x = d3.scale.ordinal().rangeRoundBands([0, width], 0.1);
          var timeScale = d3.time.scale().domain([dateMin, dateMax]).range([0, width]);
          var totalScale = null;

          var setScaleRange = function(min, max) {
            totalScale = d3.scale.linear().domain([0, domainMax]).nice();
            totalScale = totalScale.rangeRound([min, max]);
          };

          setScaleRange(height - 10, 5);

          x.domain(data.map(function(d) { return d.date; }));

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
          .tickFormat(d3.currency)
          .ticks(8);

          var xTickCount = (data.length > 14) ? 14 : data.length;
          var xAxis = d3.svg.axis()
          .scale(timeScale)
          .orient('top')
          .tickSize(height)
          .tickFormat(d3.time.format('%m/%y'))
          .ticks(8);

          var pathSegment = d3.svg.line()
          .x(function(d) { return timeScale(d.date); })
          .y(function(d) { return totalScale(d[key]); })
          .interpolate('linear');

          var customAxis = function (g) {
            g.selectAll('text')
            .attr('x', '-2')
            .attr('dy', -4)
            .style('text-anchor', 'end');
            // .attr('dx', '-3em');
          };

          var removeHover = function (d, i) {
            $('.crash-month-inner-line').remove();

            $('.month-graph-hover').hide();

            var d3Target = d3.select(d3.event.target);
            d3Target.on('mouseout', null);
            // d3Target.on('mouseover', showHover);
          };

          // var filterData = function (dataset, date) {

          // };

          // var filterGraph = function (d, i) {
          //   var newData = filterData(scope.dataset, d.date);
          // };

          var numberFormatter = d3.format(',');

          var showHover = function (d, i) {
            // console.log(d, i);
            var d3Target = d3.select(d3.event.target);
            var d3Parent = d3.select(d3.event.target.parentElement);
            // var innerVertLine = d3Parent.append('svg:line');
            var innerHorizLine = d3Parent.append('svg:line');
            // var innerVertLine = d3Parent.append('svg:line');
            var $$graphHover = $('.month-graph-hover');
            var dateOptions = {month: 'long', year: 'numeric'};

            // innerVertLine.attr('x1', timeScale(d.date))
            // .attr('y1', totalScale(d[key]))
            // .attr('x2', timeScale(d.date))
            // .attr('y2', height - 10)
            // .attr('class','crash-month-inner-line');

            innerHorizLine.attr('x1', 0)
            .attr('y1', totalScale(d[key]))
            .attr('x2', width)
            .attr('y2', totalScale(d[key]))
            .attr('class','crash-month-inner-line');
            $$graphHover.find('.amount .hover-value').text(numberFormatter(d[key]));
            $$graphHover.find('.date .hover-value').text(d.date.toLocaleDateString('en-us', dateOptions));
            $$graphHover.css({
              'top':  (d3.event.y + 20) + 'px',
              'left': d3.event.x + 'px'
            });
            $$graphHover.show();

            // d3Target.on('mouseover', null);
            d3Target.on('mouseout', removeHover);
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

          var lineGraph = g.selectAll('.crash-month-line')
          .data(data, function(d) {
            return d.date.getMonth() + '' + d.date.getYear() + '' + key;
          });

          var lineGraphEnter = lineGraph.enter();

          scope.path = scope.path || g.append('path');

          scope.path.attr('d', pathSegment(data))
          .attr('class', 'crash-month-line');

          lineGraphEnter.append('svg:circle')
          .attr('cx', function (d) { return timeScale(d.date); })
          .attr('cy', function (d) { return totalScale(d[key]); })
          .attr('r', 3)
          .attr('class','crash-month-point');

          lineGraphEnter.append('svg:circle')
          .attr('cx', function (d) { return timeScale(d.date); })
          .attr('cy', function (d) { return totalScale(d[key]); })
          .attr('r', 8)
          .attr('class','crash-month-hover-point')
          .on('mousemove', showHover)
          // .on('click', filterGraph);


          var lineGraphUpdate = lineGraph.transition();

          // lineGraphUpdate.attr('cx', function (d) { return timeScale(d.date); })
          // .attr('cy', function (d) { return totalScale(d[key]); });

          //lineGraphUpdate.selectAll('.violation-month-line').attr('d', pathSegment(data));

          lineGraph.exit().remove();

        };

        var compressData = function (data) {
          return data;
        };

        var graphData = [];

        if(scope.compress) {
          graphData = compressData(scope.dataset);
        } else {
          // console.log(scope.dataset);
          _.forOwn(scope.dataset, function (value, key) {
            graphData.push(value);
          });
          graphData = _.flatten(graphData);
          // there's less than a full month of data as the first month.
          graphData = graphData.slice(1);
        }

        console.log(graphData);

        setGraph(graphData, scope.key, $(element).find('.month-graph')[0]);

        //move the domain to the back so we can fill it with a color.
        var $$xAxis = $(element).find('.x.axis');
        var $$xDomain = $$xAxis.children('.domain').detach();
        $$xDomain.prependTo($$xAxis);
        $$xDomain = null;
        $$xAxis = null;


      }
    };
  });
