'use strict';

directives.directive('crashMap', ['$location', '$window', 'GeoData', 'Socrata', function ($location, $window, GeoData, Socrata) {
    return {
      templateUrl: 'partials/crashmap.html',
      restrict: 'E',
      scope: {
        'defaultZoom': '=defaultzoom',
        'shapes': '=area'
      },
      controller: directives.crashMap,
      controllerAs: 'crashMap',
      link: function postLink(scope, element, attrs) {

      }
    };
  }]);

directives.crashMap = function ($scope, $element, $attrs) {
  var eventSource;

  var onHoverCrash = function (layer) {
    var $$tooltip = $('.crash-map-hover');
    var x = layer.originalEvent.clientX + 10;
    var y = layer.originalEvent.clientY - 20;
    var width = Number($$tooltip.css('width').replace('px', ''));
    if(width + x > $(window).width()) {
      x = layer.originalEvent.clientX - width - 10;
    }
    $$tooltip.css({'display':'block', 'left': x + 'px', 'top': y + 'px'});
    $scope.$apply(function () {
      $scope.hoverCrash = layer.target.tooltipData;
    });
  };

  var onOutCrash = function (layer) {
    $('.crash-map-hover').css({'display':'none'});
  };

  var setFeature = function (feature, layer) {
    layer.setStyle({
      'color': '#000',
      'stroke': true,
      'fill': true,
      'fillColor': '#000',
      'fillOpacity': 0,
      'weight': '2',
      'clickable': false
    });
  };

  // Setup the geojson features. Runs setFeature for each feature.
  var buildMapFeatures = function (geoJsonData, layer) {
    _.forEach(geoJsonData.features, function (feature) {
      var geo = L.geoJson(feature, {
        onEachFeature: setFeature
      });
      layer.addLayer(geo);
    });
  };

  var getTooltipCrashes = function (location) {
    var validCrashes = [];
     _.forEach(trendStats.crashes, function (crash) {
      if (crash.latitude === location.latitude && crash.longitude === location.longitude) {
        validCrashes.push(crash);
      }
    });
    return groupData(validCrashes, $scope.dateRange);
  };

  // Set the css classes on an accident.
  // default classes, injury or death, vehicle 1 contributing factor
  var setLocationClassName = function (location) {
    var classNames = ['location-path'];

    if (location.killed) { classNames.push('killed'); }
    if (location.injured) { classNames.push('injured'); }
    if (location.cycl_killed) { classNames.push('cycl_killed'); }
    if (location.cycl_injured) { classNames.push('cycl_injured'); }
    if (location.moto_killed) { classNames.push('moto_killed'); }
    if (location.moto_injured) { classNames.push('moto_injured'); }
    if (location.ped_killed) { classNames.push('ped_killed'); }
    if (location.ped_injured) { classNames.push('ped_injured'); }
    // if(location.hasOwnProperty('contributing_factor_vehicle_1')) {
    //   classNames.push(scope.getFactorClass(location.contributing_factor_vehicle_1, 1));
    // }

    return classNames.join(' ');
  };

  // Displays a geojson layer (Community Board, Neighborhood, etc)
  // Removes all existing layers.
  // If the layer has already been loaded once we can just readd to the map
  // instead of rebuilding the entire thing from scratch.
  var displayLayer = function (geoJsonData, type) {
    $scope.layers = $scope.layers || {};
    if(!$scope.layers[type]) {
      $scope.layers[type] = L.featureGroup();
      buildMapFeatures(geoJsonData, $scope.layers[type]);
    }

   $scope.layers[type].addTo($scope.crashView);
  };

  var onViewReset = function (event) { drawCrashes(); };

   // Set the crashes on the map. Zoom and center on bounds.
  // var setMap = function (locations, shapes, zoom, rebound) {
  var setMap = function (shapes, zoom, rebound) {
    if(shapes && !$scope.shapeSet) {
      displayLayer({'features': shapes}, 'active');
      $scope.shapeSet = true;
    }
  };

  var reboundMap = function(zoom) {
    // $scope.crashView.eachLayer(function(layer) {
    //   $scope.crashView.removeLayer(layer);
    // });

    var crashLocations = L.geoJson(_.toArray($scope.distinctLocations));
    // crashLocations.addTo($scope.crashView);
    var bounds = crashLocations.getBounds();
    $scope.crashView.setView(bounds.getCenter(), zoom);
    // console.log(bounds);
  };


  var setMapTiles = function () {
    var tiles = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16,
      minZoom: 8
    });

    // var tiles = L.tileLayer('http://openmapsurfer.uni-hd.de/tiles/roadsg/x={x}&y={y}&z={z}', {
    //     attribution: 'Imagery from <a href="http://giscience.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a> &mdash; Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
    //     minZoom: 11,
    //     maxZoom: 14
    //   });

    tiles.addTo($scope.crashView);
  };

  var getLocationClasses = function(location) {
    var classes = ['location-path'];
    if(location.properties.killed) { classes.push('death'); }
    if(location.properties.injured) { classes.push('injury'); }
    if(location.properties.cycl_injured) { classes.push('cycl_injured'); }
    if(location.properties.cycl_killed) { classes.push('cycl_killed'); }
    if(location.properties.moto_injured) { classes.push('moto_injured'); }
    if(location.properties.moto_killed) { classes.push('moto_killed'); }
    if(location.properties.ped_injured) { classes.push('ped_injured'); }
    if(location.properties.ped_killed) { classes.push('ped_killed'); }
    return classes;
  };

  var drawCrashes = function() {
    var svg = $scope.svg;
    var g = $scope.g;

    var projectPoint = function (x, y) {
      var point = $scope.crashView.latLngToLayerPoint(new L.LatLng(y, x));
      this.stream.point(point.x, point.y);
    };

    var transform = d3.geo.transform({point: projectPoint}),
        locations = _.toArray($scope.distinctLocations),
        pathInitial = d3.geo.path().pointRadius(function(d) { return 0; }).projection(transform),
        path = d3.geo.path().pointRadius(function(d) { return crashScale(d.properties.crashIds.length); }).projection(transform);

    var domainMax = d3.max(locations, function(d) {
      return d.properties.crashIds.length;
    });

    var domainMin = 1;

    var crashScale = d3.scale.sqrt().domain([domainMin, domainMax]).range([3, 25]);


    var bounds = path.bounds({type: 'FeatureCollection', features: locations}),
        topLeft = bounds[0],
        bottomRight = bounds[1];

    svg.attr('width', bottomRight[0] - topLeft[0])
      .attr('height', bottomRight[1] - topLeft[1])
      .style('left', topLeft[0] + 'px')
      .style('top', topLeft[1] + 'px');

    g.attr('transform', 'translate(' + -topLeft[0] + ',' + -topLeft[1] + ')');

    var crash = g.selectAll('path')
      .data(locations, function(d) {
        return d.properties.crashKey;
      });

    var crashEnter = crash.enter().append('path')
      .attr('d', path)
      .attr('class', function(d) {
        return getLocationClasses(d).join(' ');
      });
      // .attr('style', function (d) {
      //   return '#00000';
      // });

    var crashUpdate = crash.transition()
      .attr('d', path)
      .attr('class', function(d) {
        return getLocationClasses(d).join(' ');
      });
      // .attr('fill', function(d) {
      //   return '#000000';
      // });

    crash.exit().remove();
    $scope.drawing = false;
  };

  var getCrashKey = function (crash) {
    var re = / /g;
    return (crash.on_street_name + crash.cross_street_name + crash.zip_code).replace(re, '');
  };

  var buildLocation = function(location) {
    return {
      'type': 'Feature',
      'geometry': { 'type': 'Point', 'coordinates': [location.longitude, location.latitude] },
    };
  };

  var setDistinctLocations = function (newCrashes) {
    // console.log('setDistinctLocations start:', new Date());
    _.forEach(_.filter(newCrashes, function(crash) { return crash.location.longitude; }), function (crash) {
      var crashKey = getCrashKey(crash);

      if(!$scope.distinctLocations.hasOwnProperty(crashKey)) {
        $scope.distinctLocations[crashKey] = buildLocation(crash.location);
        $scope.distinctLocations[crashKey].properties = {};
        $scope.distinctLocations[crashKey].properties.crashIds = [];
        $scope.distinctLocations[crashKey].properties.factors = [];
        // $scope.distinctLocations[crashKey].location = buildLocation(crash.location);
        $scope.distinctLocations[crashKey].properties.crashKey = crashKey;
        $scope.distinctLocations[crashKey].properties.off_street_name = crash.off_street_name;
        $scope.distinctLocations[crashKey].properties.on_street_name = crash.on_street_name;
        $scope.distinctLocations[crashKey].properties.cross_street_name = crash.cross_street_name;
        $scope.distinctLocations[crashKey].properties.number_of_persons_killed = 0;
        $scope.distinctLocations[crashKey].properties.number_of_persons_injured = 0;
        $scope.distinctLocations[crashKey].properties.number_of_cyclist_injured = 0;
        $scope.distinctLocations[crashKey].properties.number_of_cyclist_killed = 0;
        $scope.distinctLocations[crashKey].properties.number_of_motorist_injured = 0;
        $scope.distinctLocations[crashKey].properties.number_of_motorist_killed = 0;
        $scope.distinctLocations[crashKey].properties.number_of_pedestrians_injured = 0;
        $scope.distinctLocations[crashKey].properties.number_of_pedestrians_killed = 0;
      }

      $scope.distinctLocations[crashKey].properties.crashIds.push(crash.unique_key);
      if (crash.contributing_factor_vehicle_1 !== '' && $scope.distinctLocations[crashKey].properties.factors.indexOf(crash.contributing_factor_vehicle_1) < 0) {
        $scope.distinctLocations[crashKey].properties.factors.push(crash.contributing_factor_vehicle_1);
      }
      if (crash.contributing_factor_vehicle_2 !== '' && $scope.distinctLocations[crashKey].properties.factors.indexOf(crash.contributing_factor_vehicle_2) < 0) {
        $scope.distinctLocations[crashKey].properties.factors.push(crash.contributing_factor_vehicle_2);
      }
      if (crash.number_of_persons_killed > 0) {
        $scope.distinctLocations[crashKey].properties.number_of_persons_killed += crash.number_of_persons_killed;
        $scope.distinctLocations[crashKey].properties.killed = true;
      }
      if (crash.number_of_persons_injured > 0) {
       $scope.distinctLocations[crashKey].properties.number_of_persons_injured += crash.number_of_persons_injured;
       $scope.distinctLocations[crashKey].properties.injured = true;
      }
      if (crash.number_of_cyclist_injured > 0) {
        $scope.distinctLocations[crashKey].properties.number_of_cyclist_injured += crash.number_of_cyclist_injured;
        $scope.distinctLocations[crashKey].properties.cycl_injured = true;
      }
      if (crash.number_of_cyclist_killed > 0) {
       $scope.distinctLocations[crashKey].properties.number_of_cyclist_killed += crash.number_of_cyclist_killed;
       $scope.distinctLocations[crashKey].properties.cycl_killed = true;
      }
      if (crash.number_of_motorist_injured > 0) {
        $scope.distinctLocations[crashKey].properties.number_of_motorist_injured += crash.number_of_motorist_injured;
        $scope.distinctLocations[crashKey].properties.moto_injured = true;
      }
      if (crash.number_of_motorist_killed > 0) {
        $scope.distinctLocations[crashKey].properties.number_of_motorist_killed += crash.number_of_motorist_killed;
       $scope.distinctLocations[crashKey].properties.moto_killed = true;
      }
      if (crash.number_of_pedestrians_injured > 0) {
        $scope.distinctLocations[crashKey].properties.number_of_pedestrians_injured += crash.number_of_pedestrians_injured;
        $scope.distinctLocations[crashKey].properties.ped_injured = true;
      }
      if (crash.number_of_pedestrians_killed > 0) {
       $scope.distinctLocations[crashKey].properties.number_of_pedestrians_killed += crash.number_of_pedestrians_killed;
       $scope.distinctLocations[crashKey].properties.ped_killed = true;
      }
    });
    // console.log('setDistinctLocations end:', new Date());
  };

  var setMap = function() {
    if(!$scope.mapSet) {
      $scope.crashView = L.map(document.querySelector('.crash-data-view-map'), {center: [40.7250, -74.00], zoom: $scope.defaultZoom});
      $scope.crashView.addLayer(L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png',
        { attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 16,
        minZoom: 11 }));
      $scope.svg = $scope.svg || d3.select($scope.crashView.getPanes().overlayPane).append('svg');
      $scope.g = $scope.g || $scope.svg.append('g').attr('class', 'leaflet-zoom-hide');
      $scope.crashView.on('viewreset', onViewReset);
    }
  }

  var handleCrashEvent = function (event) {
    // console.log('crash event:', event);
    var crash = JSON.parse(event.data);
    // console.log('crash:', crash);
    $scope.unloadedCrashes.push(crash);

    if(!$scope.drawing && $scope.unloadedCrashes.length > 200) {

      setDistinctLocations($scope.unloadedCrashes);
      setMap();
      $scope.drawing = true;
      $scope.mapSet = true;
      drawCrashes();
      // reboundMap($scope.defaultZoom);
      $scope.crashes = $scope.crashes.concat($scope.unloadedCrashes);
      $scope.unloadedCrashes = [];
    }
  };

  var handleCloseEvent = function (event) {
    console.log('closing sse connection', new Date());
    // console.log($scope.crashes);
    if($scope.unloadedCrashes.length > 0) {
      setDistinctLocations($scope.unloadedCrashes);
      drawCrashes();
      // reboundMap($scope.defaultZoom);
      $scope.crashes = $scope.crashes.concat($scope.unloadedCrashes);
      $scope.unloadedCrashes = [];
    }
    event.target.close();
  };

  var getCrashes = function (type) {
    console.log('opening sse connection', new Date());
    eventSource = new EventSource('/sse/crashes/city/0/2015');
    eventSource.onmessage = function(evt) {
      console.log('untyped event: ', evt);
    };
    eventSource.addEventListener('crash', handleCrashEvent);
    eventSource.addEventListener('close', handleCloseEvent);
  };

  $scope.type;
  $scope.crashes = [];
  $scope.distinctLocations = {};
  $scope.unloadedCrashes = [];
  $scope.drawing = false;
  $scope.shapeSet = false;
  $scope.mapSet = false;

  $scope.$on('loadMap', function (event, type) {
    if(!$scope.type || $scope.type.type !== type.type || $scope.type.year !== type.year) {
      $scope.type = type;
      getCrashes(type);
    }
  });

};

directives.crashMap.$inject = ['$scope', '$element', '$attrs'];
