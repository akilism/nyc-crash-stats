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

directives.crashMap = function ($scope, $element, $attrs, $location, Socrata) {
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
      // console.log(feature);
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

  var bounds = $scope.layers[type].getBounds();
   $scope.layers[type].addTo($scope.crashView);
   // $scope.crashView.fitBounds(bounds);
  };

  var onViewReset = function (event) {
    // console.log($scope.crashView.getZoom());
    drawCrashes();
    // reboundMap($scope.crashView.getZoom());
  };

   // Set the crashes on the map. Zoom and center on bounds.
  // var setMap = function (locations, shapes, zoom, rebound) {
  // var setMap = function (shapes, zoom, rebound) {
  //   if(shapes && !$scope.shapeSet) {
  //     displayLayer({'features': shapes}, 'active');
  //     $scope.shapeSet = true;
  //   }
  // };

  var reboundMap = function(zoom) {
    // $scope.crashView.eachLayer(function(layer) {
    //   $scope.crashView.removeLayer(layer);
    // });

    var crashLocations = L.geoJson(_.toArray($scope.distinctLocations));
    // crashLocations.addTo($scope.crashView);
    var bounds = crashLocations.getBounds();
    // $scope.crashView.setView(bounds.getCenter(), zoom);
    $scope.crashView.fitBounds(bounds);
    // console.log(bounds);
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

    var crashScale = d3.scale.sqrt().domain([domainMin, domainMax]).range([4, 25]);


    var bounds = path.bounds({type: 'FeatureCollection', features: locations}),
        topLeft = bounds[0],
        bottomRight = bounds[1];

    // svg.attr('width', (bottomRight[0] - topLeft[0]) + 150)
    //   .attr('height', (bottomRight[1] - topLeft[1]) + 150);
      // .style('left', topLeft[0] + 'px')
      // .style('top', topLeft[1] + 'px');

    // g.attr('transform', 'translate(' + -topLeft[0] + ',' + -topLeft[1] + ')');

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

    var crashUpdate = crash.attr('d', path)
      .attr('class', function(d) {
        return getLocationClasses(d).join(' ');
      });
      // .attr('fill', function(d) {
      //   return '#000000';
      // });

    crash.exit().remove();
    $scope.drawing = false;
  };

  var getCrashKey = function (crash, swap) {
    var re = / /g;
    if(swap) {
      return (crash.on_street_name + crash.cross_street_name + crash.zip_code).replace(re, '');
    } else {
      return (crash.cross_street_name + crash.on_street_name + crash.zip_code).replace(re, '');
    }
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
      var crashKey = getCrashKey(crash, false);
      var crashKeySwap = getCrashKey(crash, true);

      if(!$scope.distinctLocations.hasOwnProperty(crashKey) && $scope.distinctLocations.hasOwnProperty(crashKeySwap)) {
        crashKey = crashKeySwap;
      };

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
      // if (crash.contributing_factor_vehicle_1 !== '' && $scope.distinctLocations[crashKey].properties.factors.indexOf(crash.contributing_factor_vehicle_1) < 0) {
      //   $scope.distinctLocations[crashKey].properties.factors.push(crash.contributing_factor_vehicle_1);
      // }
      // if (crash.contributing_factor_vehicle_2 !== '' && $scope.distinctLocations[crashKey].properties.factors.indexOf(crash.contributing_factor_vehicle_2) < 0) {
      //   $scope.distinctLocations[crashKey].properties.factors.push(crash.contributing_factor_vehicle_2);
      // }
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

  var getTransformValues = _.compose(function(a) { return a.splice(4); },
  function(a) { return a.map(function(i) { return parseInt(i, 10) * -1; }); },
  function(s) { return s.split(',');},
  function(s) { return s.replace(' ','');},
  function(s) { return s.replace(')','');});

  var setMap = function() {
    var $map = $('.crash-data-view-map');
    $scope.mapSet = true;
    $scope.crashView = L.map(document.querySelector('.crash-data-view-map'), {center: [40.7250, -74.00], zoom: $scope.defaultZoom});
    $scope.crashView.addLayer(L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 16,
      minZoom: 11,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }));



    $scope.svg = $scope.svg || d3.select($scope.crashView.getPanes().overlayPane).append('svg');
    $scope.svg.attr('width', $map.width() + 100)
     .attr('height', $map.height() + 100)
     .attr('style','top:0px; left:0px;');
    // $($scope.svg[0]).css({top:position.y + 'px', left: position.x + 'px'});
    $scope.g = $scope.g || $scope.svg.append('g').attr('class', 'leaflet-zoom-hide');
    $scope.crashView.on('viewreset', onViewReset)
    // .on('movestart', function(evt) {
    //   console.log(evt);
    // })
    .on('moveend', function(evt) {
      // if(evt.target._handlers[0].hasOwnProperty('_positions')) {
      //   var position = evt.target._handlers[0]._positions[evt.target._handlers[0]._positions.length-1];
      //   // console.log($scope.svg);
      //   // $('.leaflet-map-pane').css('transform')
      //   var $svg = $($scope.svg[0]);
      //   var transfrm = $('.leaflet-zoom-animated').css('transform');
      //   var tVals = getTransformValues(transfrm);
      //   $svg.css({'transform': transfrm});
      //   $svg.find('g').css({'transform':'matrix(1, 0, 0, 1, ' + tVals[0] + ', ' + tVals[1] + ')'});
      //   // $scope.svg.attr('style', 'top:' + position.y + 'px; left:' + position.x + 'px');
      //     //g = transform: translate3d(pos.x + 'px', pos.y + 'px', 0px);
      // }

    });
  };

  var handleCrashEvent = function (event) {
    // console.log('crash event:', event);
    var crash = JSON.parse(event.data);
    // console.log('crash:', crash);
    $scope.unloadedCrashes.push(crash);

    if(!$scope.drawing && $scope.unloadedCrashes.length > 100) {
      if(!$scope.mapSet){ setMap(); }
      setDistinctLocations($scope.unloadedCrashes);
      $scope.drawing = true;

      drawCrashes();
      // if($location.$$path !== '/') {
      //   reboundMap(13);
      // }
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
      reboundMap(10);
      // if($location.$$path.indexOf('borough') !== -1) {
      //   reboundMap($scope.defaultZoom);
      // } else if($location.$$path !== '/') {
      //   reboundMap(13);
      // }

      $scope.crashes = $scope.crashes.concat($scope.unloadedCrashes);
      $scope.unloadedCrashes = [];
    }
    event.target.close();
  };

  var getCrashes = function (type) {
    console.log('opening sse connection', new Date());
    var sourceUrl = '/sse/crashes' + type.type + '/' + type.year;
    // console.log(sourceUrl);
    eventSource = new EventSource(sourceUrl);
    eventSource.onmessage = function(evt) {
      // console.log('untyped event: ', evt);
    };
    eventSource.addEventListener('crash', handleCrashEvent);
    eventSource.addEventListener('close', handleCloseEvent);
  };

  var getShape = function(type) {
    if (type.type == '/city/0') { return []; }
    var typeParts = type.type.split('/');
    var options = {
      'type': typeParts[1],
      'value': typeParts[2],
      'shape': true
    };
    $scope.type = typeParts[2];
    return Socrata(options, 'featureTotal').then(function(shapes) {
      // if(!$scope.mapSet){ setMap(); }
      displayLayer({'features': shapes}, typeParts[1]);
    });
  }

  $scope.type;
  $scope.crashes = [];
  $scope.distinctLocations = {};
  $scope.unloadedCrashes = [];
  $scope.drawing = false;
  $scope.shapeSet = false;
  $scope.mapSet = false;


  $scope.$on('loadMap', function (event, type) {
    console.log($scope.type, type);
    if(!$scope.type || $scope.type.type !== type.type || $scope.type.year !== type.year) {
      setMap();
      $scope.type = type;
      $scope.crashes = [];
      $scope.distinctLocations = {};
      $scope.unloadedCrashes = [];
      getCrashes(type);
      getShape(type);
    }
  });

};

directives.crashMap.$inject = ['$scope', '$element', '$attrs', '$location', 'Socrata'];
