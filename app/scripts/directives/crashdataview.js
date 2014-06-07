'use strict';

directives.directive('crashDataView', ['$location', '$window', 'GeoData', 'Socrata', function ($location, $window, GeoData, Socrata) {
    return {
      templateUrl: 'partials/crashdataview.html',
      restrict: 'E',
      scope: {
        'dataset': '=dataset',
        'setActiveAccident': '=setaccident',
        'calculateYearlyStats': '=statcalc',
        'featuredArea': '=area',
        'getFactorClass': '=classer',
        'defaultZoom': '=defaultzoom',
        'areaShapes': '=shapes'
      },
      link: function postLink(scope, element, attrs) {
        var mapId = scope.dataset.id;
        var map = element.find('.crash-data-view-map');
        map.attr('id', mapId);
        scope.crashMap = L.map(map[0]);
        scope.selected = '';

        // Handles the highlight toggle between Injury / Death and Factors.
        scope.highlight = function ($event, type) {

          $('.map-highlight li').removeClass('active');
          $('.map-key div').removeClass('active');
          // console.log($event);
          $($event.currentTarget.parentElement).addClass('active');

          switch(type) {
            case 'factors':
              $('.crash-data-view-map').removeClass('death-injury-highlight').addClass('factor-highlight');
              $('.key-factor').addClass('active');
              break;
            case 'death':
              $('.crash-data-view-map').removeClass('factor-highlight').addClass('death-injury-highlight');
              $('.key-type').addClass('active');
              break;
          }
        };

        scope.closeControls = function () {
          $('.crash-data-map-controls').hide();
        };

        scope.showControls = function () {
          $('.crash-data-map-controls').show();
        };

        scope.loadDetails = function ($event) {
          if(scope.activeFeature) {
            console.log(scope.activeFeature);
            var properties = scope.activeFeature.properties;
            var link = '';
            if(properties.hasOwnProperty('communityDistrict')) {
              link = '/community/' + properties.communityDistrict;
            } else if(properties.hasOwnProperty('neighborhood')) {
              link = '/neighborhood/' + properties.neighborhood;
            } else if(properties.hasOwnProperty('cityCouncilDistrict')) {
              link = '/citycouncil/' + properties.cityCouncilDistrict;
            } else if(properties.hasOwnProperty('policePrecinct')) {
              link = '/precinct/' + properties.policePrecinct;
            } else if(properties.hasOwnProperty('postalCode')) {
              link = '/zipcode/' + properties.postalCode;
            }

            ga('send', 'event', 'moredetails', link);
              $window.location.href = link;
          }
        };

        scope.$on('displayMapOverlay', function (event, type) {
          showOverlay(type);
        });

        var showOverlay = function (type) {
          //Hide layer if already selected.
          if(scope.selected === type) {
            removeLayer(type);
            scope.selected = '';
            return;
          }

          scope.selected = type;

          if(!scope[type]) {
            GeoData('/' + type).then(function (data) {
              scope[type] = data;
              displayLayer(scope[type], type);
            });
          } else {
            displayLayer(scope[type], type);
          }
        };

        // Accident hover mouse out event.
        // var onMouseOut = function (event) {
        //     var className = event.target.options.className.split(' ')[0];
        //     $('.' + className).removeClass('hover-accident');
        //     event.target.off('mouseout', onMouseOut);
        //     event.target.on('mouseover', onMouseOver);
        // };

        // Accident hover mouse over event.
        // var onMouseOver = function (event) {
        //     var className = event.target.options.className.split(' ')[0];
        //     $('.' + className).addClass('hover-accident');
        //     event.target.on('mouseout', onMouseOut);
        //     event.target.off('mouseover', onMouseOver);
        // };

        // Accident onclick event.
        var onClick = function (event) {
          // console.log(event);
          var accidentId = event.target.options.className.split(' ')[1].replace('accident-','');
          console.log(accidentId);
          scope.setActiveAccident(accidentId, true);
          $('.accident-popup').css('top', (pageYOffset + 30) + 'px').show();
          ga('send', 'event', 'accidentPopup', scope.selected, accidentId);
        };

        // Displays a geojson layer (Community Board, Neighborhood, etc)
        // Removes all existing layers.
        // If the layer has already been loaded once we can just readd to the map
        // instead of rebuilding the entire thing from scratch.
        var displayLayer = function (geoJsonData, type) {
          removeAllLayers();
          scope.layers = scope.layers || {};
          if(!scope.layers[type]) {
            scope.layers[type] = L.featureGroup();
            buildMapFeatures(geoJsonData, scope.layers[type]);
          }

          scope.layers[type].addTo(scope.crashMap);
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

        // Removes a single layer from the map
        var removeLayer = function (type) {
          if(scope.layers && scope.layers[type]) {
            scope.crashMap.removeLayer(scope.layers[type]);
          }
        };

        // Removes all layers from the map.
        var removeAllLayers = function () {
          removeLayer('borough');
          removeLayer('citycouncil');
          removeLayer('community');
          removeLayer('neighborhood');
          removeLayer('precinct');
          removeLayer('zipcode');
          removeLayer('active');
        };

        // Translate the community board district ID's from the shapefile into
        // the borough specific name / id.
        var translateCommunityBoardDistrict = function (districtId) {
          if (districtId > 500) {
            return 'Staten Island Community Board ' + (districtId - 500);
          } else if (districtId > 400) {
            return 'Queens Community Board ' + (districtId - 400);
          } else if (districtId > 300) {
            return 'Brooklyn Community Board ' + (districtId - 300);
          } else if (districtId > 200) {
            return 'Bronx Community Board ' + (districtId - 200);
          } else if (districtId > 100) {
            return 'Manhattan Community Board ' + (districtId - 100);
          } else {
            return '';
          }
        };

        var addOrdinal = function (i) {
          var j = i % 10;
          if (j === 1 && i !== 11) {
            return i + 'st';
          }
          if (j === 2 && i !== 12) {
            return i + 'nd';
          }
          if (j === 3 && i !== 13) {
            return i + 'rd';
          }
          return i + 'th';
        };

        // Display formatting for the feature name. (tooltip and title displays)
        var getFeatureContent = function (properties, selected) {
          switch (selected) {
            case 'borough':
              return properties.borough;
            case 'citycouncil':
              return 'City Council District ' + properties.cityCouncilDistrict;
            case 'community':
              return translateCommunityBoardDistrict(properties.communityDistrict);
            case 'neighborhood':
              return properties.neighborhood;
            case 'precinct':
              var precinct = parseInt(properties.policePrecinct, 10);
              if(precinct === 14) { return 'Midtown South Police Precinct'; }
              if(precinct === 18) { return 'Midtown North Police Precinct'; }
              if(precinct === 22) { return 'Central Park Police Precinct'; }
              return addOrdinal(precinct) + ' Police Precinct';
            case 'zipcode':
              return 'Zip Code ' + properties.postalCode;
          }

          return '';
        };

        // Show the feature overlay tooltip.
        var showTooltip = function (properties, selected, pos) {
          // console.log(properties);
          var content = getFeatureContent(properties, selected);
          content = content + '<br><span class="tooltip-filter">Click to filter</span>';
          $('.map-tooltip').html(content).css({
            'left': (pos.x + 5) + 'px',
            'top': (pos.y + 5) + 'px'
          }).show();
        };

        var hideToolTip = function () {
          $('.map-tooltip').hide();
        };

        // Style formatting and event attachment for overlay features.
        var setFeature = function (feature, layer) {
          layer.setStyle({
            'color': '#000',
            'stroke': true,
            'fill': true,
            'fillColor': '#000',
            'fillOpacity': 0,
            'weight': '2',
            'clickable': true
          });

          if (scope.setLayerHandlers) {
            layer.on('mousemove', function (event) {
              showTooltip(event.target.feature.properties, scope.selected, { 'x': event.originalEvent.pageX, 'y': event.originalEvent.pageY });
              event.target.setStyle({
                'fillOpacity': 0.25
              });
            });

            layer.on('mouseout', function (event) {
              hideToolTip();
              event.target.setStyle({
                'fillOpacity': 0
              });
            });

            layer.on('click', filterMap);
          }
        };

        var getIdentifier = function (properties, type) {
          switch(type) {
            case 'citycouncil':
              return properties.cityCouncilDistrict;
            case 'community':
              return properties.communityDistrict;
            case 'neighborhood':
              return properties.neighborhood;
            case 'precinct':
              return properties.policePrecinct;
            case 'zipcode':
              return properties.postalCode;
          }
        };

        // Filter the accidents on the map to a specific feature's bounds.
        // Builds a bounding box based on the coordinates for the feature.
        // Calls the backend api to connect to socrata and pull all the
        // accidents for the current year.
        // Calls resetMap() to add new data to the map.
        var filterMap = function (event) {

          $('#loader').show();
          var boundingBox = gju.polyBounding(event.target.feature.geometry.coordinates);

          scope.activeFeature = event.target.feature;

          var options = {
            // boundingBox: formatBoundingBox(boundingBox),
            type: scope.selected,
            value: getIdentifier(event.target.feature.properties, scope.selected),
            year: '2014-01-01'
            // properties: event.target.feature.properties
          };

          Socrata(options, 'feature').then(function (result) {
            $('#loader').hide();
            //zoom map to shape.
            //load in all accidents.
            if(result.hasOwnProperty('accidents') && result.accidents.length > 0) {
              hideToolTip();
              var title = getFeatureContent(scope.activeFeature.properties, scope.selected);
              scope.featuredArea = title;
              $('.yearly-featured').show();
              $('.crash-data-view-wrapper h3').addClass('linked');
              resetMap(result.accidents, title);
            } else {
              removeAllLayers();
            }
          });
          ga('send', 'event', 'filterMap', scope.selected, scope.activeFeature.properties['@id']);
        };

        // Highlight the path of the active feature.
        var setActiveFeatureLayer = function (feature) {
          scope.layers.active = scope.layers.active || L.featureGroup();

          scope.layers.active.clearLayers();

          var geo = L.geoJson(feature, {
            style: {
              'color': '#0b7f7f',
              'stroke': true,
              'opacity': 1,
              'fill': false,
              'weight': '2',
              'clickable': false
            }
          });

          scope.layers.active.addLayer(geo);
          scope.layers.active.addTo(scope.crashMap);
        };

        // Resets the map to display the new data based on filtering by a geojson shape.
        var resetMap = function (result, title) {
            scope.dataset = result;
            scope.dataset.title = title;
            scope.selected = null;
            removeAllLayers();
            setDistinctLocations(scope.dataset);
            setMap(scope.distinctLocations, 14);
            setActiveFeatureLayer(scope.activeFeature);
            scope.calculateYearlyStats(scope.dataset);
        };

        // Format the bounding box so it's easier to deal with on the backend.
        var formatBoundingBox = function (boundingBox) {
          return {
            leftLat: boundingBox[0][0],
            leftLon: boundingBox[0][1],
            rightLat: boundingBox[1][0],
            rightLon: boundingBox[1][1],
          };
        };

        // Set the css classes on an accident.
        // default classes, injury or death, vehicle 1 contributing factor
        var setAccidentClassName = function (accident) {
          var classNames = ['accident-path'];

          if(accident.hasOwnProperty('crashIds')) {
            classNames = classNames.concat(_.map(accident.crashIds, function (crashId) {
              return 'accident-' + crashId;
            }));
          }

          if(accident.number_of_persons_killed > 0) {
            classNames.push('death');
          } else if(accident.number_of_persons_injured > 0) {
            classNames.push('injury');
          } else {
            classNames.push('none-hurt');
          }

          if(accident.hasOwnProperty('factors')) {
            classNames = classNames.concat(_.map(accident.factors, function (factor) {
              return scope.getFactorClass(factor, 1);
            }));
          }

          return classNames.join(' ');
        };

        // Set the accidents on the map. Zoom and center on bounds.
        var setMap = function (dataset, zoom) {
          if(scope.accidentLayer) {
            scope.crashMap.removeLayer(scope.accidentLayer);
          }

          var accidents = L.featureGroup();

          if(scope.dataset.hasOwnProperty('shapes')) {
            scope.setLayerHandlers = false;
            displayLayer({'features': scope.dataset.shapes}, 'active');
          } else {
            scope.setLayerHandlers = true;
          }

          var getR = function (location) {
            var r = location.crashIds.length + 2;
            return (r > 20) ? 20 : r;
          };

          // console.log('dataset', dataset);
          _.forEach(dataset, function (accident) {
              if(accident.location && accident.location.latitude !== 0 && accident.location.longitude !== 0) {
                var marker = L.circleMarker([accident.location.latitude, accident.location.longitude], {
                  className: setAccidentClassName(accident),
                  stroke: false,
                  fill: false
                }).setRadius(getR(accident));
                // marker.on('mouseover', onMouseOver);
                marker.on('click', onClick);

                // marker.bindPopup(getPopupContent(accident));
                accidents.addLayer(marker);
              }
          });

          scope.accidentLayer = accidents;
          var bounds = accidents.getBounds();
          accidents.addTo(scope.crashMap);

          scope.crashMap.setView(bounds.getCenter(), zoom);
        };

        var setMapTiles = function () {

          var tiles = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
            maxZoom: 16,
            minZoom: 11
          });

          tiles.addTo(scope.crashMap);
        };

        var setDistinctLocations = function (crashes) {
          scope.distinctLocations = {};

          _.forOwn(crashes, function (crash) {
            //setup the distinct locations in the dataset to assist mapping crashes.
            var crashKey = crash.longitude + ',' + crash.latitude;
            if(!scope.distinctLocations.hasOwnProperty(crashKey)) {
              scope.distinctLocations[crashKey] = {};
              scope.distinctLocations[crashKey].crashIds = [];
              scope.distinctLocations[crashKey].factors = [];
              scope.distinctLocations[crashKey].location = crash.location;
              scope.distinctLocations[crashKey].off_street_name = crash.off_street_name;
              scope.distinctLocations[crashKey].on_street_name = crash.on_street_name;
              scope.distinctLocations[crashKey].number_of_persons_killed = 0;
              scope.distinctLocations[crashKey].number_of_persons_injured = 0;
              scope.distinctLocations[crashKey].number_of_cyclist_injured = 0;
              scope.distinctLocations[crashKey].number_of_cyclist_killed = 0;
              scope.distinctLocations[crashKey].number_of_motorist_injured = 0;
              scope.distinctLocations[crashKey].number_of_motorist_killed = 0;
              scope.distinctLocations[crashKey].number_of_pedestrians_injured = 0;
              scope.distinctLocations[crashKey].number_of_pedestrians_killed = 0;
            }

            scope.distinctLocations[crashKey].crashIds.push(crash.unique_key);
            if (crash.contributing_factor_vehicle_1 !== '' && scope.distinctLocations[crashKey].factors.indexOf(crash.contributing_factor_vehicle_1) < 0) {
              scope.distinctLocations[crashKey].factors.push(crash.contributing_factor_vehicle_1);
            }
            if (crash.contributing_factor_vehicle_2 !== '' && scope.distinctLocations[crashKey].factors.indexOf(crash.contributing_factor_vehicle_2) < 0) {
              scope.distinctLocations[crashKey].factors.push(crash.contributing_factor_vehicle_2);
            }



            if (crash.number_of_persons_killed > 0) {
              scope.distinctLocations[crashKey].number_of_persons_killed += crash.number_of_persons_killed;
              scope.distinctLocations[crashKey].killed = true;
            }
            if (crash.number_of_persons_injured > 0) {
             scope.distinctLocations[crashKey].number_of_persons_injured += crash.number_of_persons_injured;
             scope.distinctLocations[crashKey].injured = true;
            }
            if (crash.number_of_cyclist_injured > 0) {
              scope.distinctLocations[crashKey].number_of_cyclist_injured += crash.number_of_cyclist_injured;
              scope.distinctLocations[crashKey].cycl_injured = true;
            }
            if (crash.number_of_cyclist_killed > 0) {
             scope.distinctLocations[crashKey].number_of_cyclist_killed += crash.number_of_cyclist_killed;
             scope.distinctLocations[crashKey].cycl_killed = true;
            }
            if (crash.number_of_motorist_injured > 0) {
              scope.distinctLocations[crashKey].number_of_motorist_injured += crash.number_of_motorist_injured;
              scope.distinctLocations[crashKey].moto_injured = true;
            }
            if (crash.number_of_motorist_killed > 0) {
              scope.distinctLocations[crashKey].number_of_motorist_killed += crash.number_of_motorist_killed;
             scope.distinctLocations[crashKey].moto_killed = true;
            }
            if (crash.number_of_pedestrians_injured > 0) {
              scope.distinctLocations[crashKey].number_of_pedestrians_injured += crash.number_of_pedestrians_injured;
              scope.distinctLocations[crashKey].ped_injured = true;
            }
            if (crash.number_of_pedestrians_killed > 0) {
             scope.distinctLocations[crashKey].number_of_pedestrians_killed += crash.number_of_pedestrians_killed;
             scope.distinctLocations[crashKey].ped_killed = true;
            }
          });
        };

        setDistinctLocations(scope.dataset);
        //setMap(scope.dataset, scope.defaultZoom);
        setMap(scope.distinctLocations, scope.defaultZoom);
        setMapTiles();
      }
    };
  }]);
