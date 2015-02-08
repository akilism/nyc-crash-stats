'use strict';

directives.directive('crashMap', ['$location', '$window', 'GeoData', 'Socrata', function ($location, $window, GeoData, Socrata) {
    return {
      templateUrl: 'partials/crashmap.html',
      restrict: 'E',
      scope: {
        // 'dataset': '=dataset',
        // 'setActiveAccident': '=setaccident',
        // 'calculateYearlyStats': '=statcalc',
        // 'featuredArea': '=area',
        // 'getFactorClass': '=classer',
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
  $scope.crashes = [];
  $scope.distinctLocations = {};
  $scope.unloadedCrashes = [];
  $scope.drawing = false;
  $scope.shapeSet = false;

  var eventSource;
  var map = $element.find('.crash-data-view-map');

  $scope.crashView = L.map(map[0]);

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

   // Set the crashes on the map. Zoom and center on bounds.
  // var setMap = function (locations, shapes, zoom, rebound) {
  var setMap = function (shapes, zoom, rebound) {
    var crashLocations;
    if($scope.hasOwnProperty('crashLayer')) { crashLocations = $scope.crashLayer } else { crashLocations = L.featureGroup(); rebound = true; }
    crashLocations.clearLayers();

    if(shapes && !$scope.shapeSet) {
      displayLayer({'features': shapes}, 'active');
      $scope.shapeSet = true;
    }

    // var getR = function (location) {
    //   var r = Math.floor(location.crashIds.length/2) + 4;
    //   return (r > 20) ? 20 : r;
    // };

    // _.forOwn(locations, function (location) {
    //     if(location.location.latitude && location.location.longitude) {
    //       var marker = L.circleMarker([location.location.latitude, location.location.longitude], {
    //         className: setLocationClassName(location),
    //         stroke: false,
    //         fill: false
    //       }).setRadius(getR(location));
    //       // marker.on('click', onClick);

    //       // marker.bindPopup(getPopupContent(crash));
    //       // marker.tooltipData = {};
    //       // marker.tooltipData.crashes = getTooltipCrashes(location.location);
    //       // marker.tooltipData.on_street_name = location.on_street_name;
    //       // marker.tooltipData.off_street_name = location.off_street_name;
    //       // marker.on('mousemove', onHoverCrash);
    //       // marker.on('mouseout', onOutCrash);
    //       crashLocations.addLayer(marker);
    //     }
    // });

    // $scope.crashLayer = crashLocations;
    // crashLocations.addTo($scope.crashView);
    // if(rebound && _.size(locations) > 0) {
    //   // var bounds = crashLocations.getBounds();
    // }
    $scope.crashView.setView([40.7127, -74.0059], zoom);
    $scope.svg = $scope.svg || d3.select($scope.crashView.getPanes().overlayPane).append('svg');
    $scope.g = $scope.g || $scope.svg.append('g').attr('class', 'leaflet-zoom-hide');
    console.log($scope.svg, $scope.g);
    $scope.drawing = false;
  };

  var setMapTiles = function () {
    var tiles = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16,
      minZoom: 11
    });

    tiles.addTo($scope.crashView);
  };

  var drawCrashes = function() {
    var domainMax = d3.max($scope.distinctLocations, function(d) {
      return d.crashIds.length;
    });
    var domainMin = 1;
    var svg = $scope.svg;
    var g = $scope.g;

    var projectPoint = function (x, y) {
      var point = $scope.crashMap.latLngToLayerPoint(new L.LatLng(y, x));
      console.log(x, y, point);
      this.stream.point(point.x, point.y);
    };

    var transform = d3.geo.transform({point: projectPoint});

    var crash = g.selectAll('path')
      .data(_.keys($scope.distinctLocations));

    var crashEnter = crash.enter().append('path')
      .attr('d', function(d) {
        var location = $scope.distinctLocations[d];
        console.log(location.location);
        return d3.geo.path(location.location).projection(transform);
      })
      .attr('class', 'crash-location')
      .attr('fill', function (d) {
        return '#dfdfdf';
      });

    var crashUpdate = crash.transition()
      .attr('d', d3.geo.path().projection(transform))
      .attr('fill', function(d) {
        return '#000000';
      });

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
      'geometry': { 'type': 'Point', 'coordinates': [location.latitude, location.longitude] },
    };
  };

  var setDistinctLocations = function (newCrashes) {
    // console.log('setDistinctLocations start:', new Date());
    _.forEach(_.filter(newCrashes, function(crash) { return crash.location.longitude; }), function (crash) {
      var crashKey = getCrashKey(crash);

      if(!$scope.distinctLocations.hasOwnProperty(crashKey)) {
        $scope.distinctLocations[crashKey] = {};
        $scope.distinctLocations[crashKey].crashIds = [];
        $scope.distinctLocations[crashKey].factors = [];
        $scope.distinctLocations[crashKey].location = buildLocation(crash.location);
        $scope.distinctLocations[crashKey].off_street_name = crash.off_street_name;
        $scope.distinctLocations[crashKey].on_street_name = crash.on_street_name;
        $scope.distinctLocations[crashKey].cross_street_name = crash.cross_street_name;
        $scope.distinctLocations[crashKey].number_of_persons_killed = 0;
        $scope.distinctLocations[crashKey].number_of_persons_injured = 0;
        $scope.distinctLocations[crashKey].number_of_cyclist_injured = 0;
        $scope.distinctLocations[crashKey].number_of_cyclist_killed = 0;
        $scope.distinctLocations[crashKey].number_of_motorist_injured = 0;
        $scope.distinctLocations[crashKey].number_of_motorist_killed = 0;
        $scope.distinctLocations[crashKey].number_of_pedestrians_injured = 0;
        $scope.distinctLocations[crashKey].number_of_pedestrians_killed = 0;
      }

      $scope.distinctLocations[crashKey].crashIds.push(crash.unique_key);
      if (crash.contributing_factor_vehicle_1 !== '' && $scope.distinctLocations[crashKey].factors.indexOf(crash.contributing_factor_vehicle_1) < 0) {
        $scope.distinctLocations[crashKey].factors.push(crash.contributing_factor_vehicle_1);
      }
      if (crash.contributing_factor_vehicle_2 !== '' && $scope.distinctLocations[crashKey].factors.indexOf(crash.contributing_factor_vehicle_2) < 0) {
        $scope.distinctLocations[crashKey].factors.push(crash.contributing_factor_vehicle_2);
      }
      if (crash.number_of_persons_killed > 0) {
        $scope.distinctLocations[crashKey].number_of_persons_killed += crash.number_of_persons_killed;
        $scope.distinctLocations[crashKey].killed = true;
      }
      if (crash.number_of_persons_injured > 0) {
       $scope.distinctLocations[crashKey].number_of_persons_injured += crash.number_of_persons_injured;
       $scope.distinctLocations[crashKey].injured = true;
      }
      if (crash.number_of_cyclist_injured > 0) {
        $scope.distinctLocations[crashKey].number_of_cyclist_injured += crash.number_of_cyclist_injured;
        $scope.distinctLocations[crashKey].cycl_injured = true;
      }
      if (crash.number_of_cyclist_killed > 0) {
       $scope.distinctLocations[crashKey].number_of_cyclist_killed += crash.number_of_cyclist_killed;
       $scope.distinctLocations[crashKey].cycl_killed = true;
      }
      if (crash.number_of_motorist_injured > 0) {
        $scope.distinctLocations[crashKey].number_of_motorist_injured += crash.number_of_motorist_injured;
        $scope.distinctLocations[crashKey].moto_injured = true;
      }
      if (crash.number_of_motorist_killed > 0) {
        $scope.distinctLocations[crashKey].number_of_motorist_killed += crash.number_of_motorist_killed;
       $scope.distinctLocations[crashKey].moto_killed = true;
      }
      if (crash.number_of_pedestrians_injured > 0) {
        $scope.distinctLocations[crashKey].number_of_pedestrians_injured += crash.number_of_pedestrians_injured;
        $scope.distinctLocations[crashKey].ped_injured = true;
      }
      if (crash.number_of_pedestrians_killed > 0) {
       $scope.distinctLocations[crashKey].number_of_pedestrians_killed += crash.number_of_pedestrians_killed;
       $scope.distinctLocations[crashKey].ped_killed = true;
      }
    });
    // console.log('setDistinctLocations end:', new Date());
  };

  var handleCrashEvent = function (event) {
    // console.log('crash event:', event);
    var crash = JSON.parse(event.data);
    // console.log('crash:', crash);
    $scope.unloadedCrashes.push(crash);

    if(!$scope.drawing && $scope.unloadedCrashes.length > 250) {
      $scope.drawing = true;
      setDistinctLocations($scope.unloadedCrashes);
      drawCrashes();
      // setMap($scope.distinctLocations, $scope.shapes, $scope.defaultZoom, false);
      $scope.crashes = $scope.crashes.concat($scope.unloadedCrashes);
      $scope.unloadedCrashes = [];
    }
  };

  var handleCloseEvent = function (event) {
    console.log('closing sse connection', new Date());
    // console.log($scope.crashes);
    if($scope.unloadedCrashes.length > 0) {
      setDistinctLocations($scope.unloadedCrashes);
      // setMap($scope.distinctLocations, $scope.shapes, $scope.defaultZoom, true);
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
  $scope.$on('loadMap', function (event, type) {
    if(!$scope.type || $scope.type.type !== type.type || $scope.type.year !== type.year) {
      $scope.type = type;
      getCrashes(type);
    }
  });

  setMapTiles();
  setMap($scope.shapes, $scope.defaultZoom, false);

};

directives.crashMap.$inject = ['$scope', '$element', '$attrs'];
