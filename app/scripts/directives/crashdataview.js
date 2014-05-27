'use strict';

directives.directive('crashDataView', ['GeoData', 'Socrata', function (GeoData, Socrata) {
    return {
      templateUrl: 'partials/crashdataview.html',
      restrict: 'E',
      scope: {
        'dataset': '=dataset',
        'setActiveAccident': '=setaccident',
        'calculateYearlyStats': '=statcalc',
        'featuredArea': '=area',
        'getFactorClass': '=classer'
      },
      link: function postLink(scope, element, attrs) {
        var mapId = scope.dataset.id;
        var map = element.find('.crash-data-view-map');
        map.attr('id', mapId);
        scope.crashMap = L.map(map[0]);
        scope.selected = '';

        // Handle the click event for the overlay display
        // Community Boards, Neighborhoods, Zip codes etc.
        // Makes the service call to get the correct shape file
        // Calls the display layer function to show the shapes
        scope.showOverlay = function (type) {

          $('.map-layers li').removeClass('active');

          //Hide layer if already selected.
          if(scope.selected === type) {
                removeLayer(type);
                scope.selected = '';
                return;
          } else {
            $(event.target.parentElement).addClass('active');
          }

          scope.selected = type;
          switch (type) {
            case 'borough':
              if(!scope.borough) {
                GeoData('/borough').then(function (data) {
                  scope.borough = data;
                  displayLayer(scope.borough, 'borough');
                });
              } else {
                displayLayer(scope.borough, 'borough');
              }
              break;
            case 'community':
              if(!scope.community) {
                GeoData('/community').then(function (data) {
                  scope.community = data;
                  displayLayer(scope.community, 'community');
                });
              } else {
                displayLayer(scope.community, 'community');
              }
              break;
            case 'neighborhood':
              if(!scope.neighborhood) {
                GeoData('/neighborhood').then(function (data) {
                  scope.neighborhood = data;
                  displayLayer(scope.neighborhood, 'neighborhood');
                });
              } else {
                displayLayer(scope.neighborhood, 'neighborhood');
              }
              break;
            case 'precinct':
              if(!scope.precinct) {
                GeoData('/precinct').then(function (data) {
                  scope.precinct = data;
                  displayLayer(scope.precinct, 'precinct');
                });
              } else {
                displayLayer(scope.precinct, 'precinct');
              }
              break;
            case 'zipcode':
              if(!scope.zipcode) {
                GeoData('/zipcode').then(function (data) {
                  scope.zipcode = data;
                  displayLayer(scope.zipcode, 'zipcode');
                });
              } else {
                displayLayer(scope.zipcode, 'zipcode');
              }
              break;
          }
        };

        // Handles the highlight toggle between Injury / Death and Factors.
        scope.highlight = function ($event, type) {

          $('.map-highlight li').removeClass('active');
          $(event.target.parentElement).addClass('active');

          switch(type) {
            case 'factors':
              $('.crash-data-view-map').removeClass('death-injury-highlight').addClass('factor-highlight');
              break;
            case 'death':
              $('.crash-data-view-map').removeClass('factor-highlight').addClass('death-injury-highlight');
              break;
          }
        };

        // Handle the toggle for accidents / deaths / both.
        scope.displayAccidentType = function ($event, type) {

          $('.map-accident-type li').removeClass('active');

          //Unfilter.
          if(scope.accidentFilterType === type) {
                $('.crash-data-view-map').removeClass('only-injury').removeClass('only-death');
                scope.accidentFilterType = '';
                return;
          } else {
            scope.accidentFilterType = type;
            $(event.target.parentElement).addClass('active');
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

        scope.closeControls = function () {
          $('.crash-data-map-controls').hide();
        };

        scope.showControls = function () {
          $('.crash-data-map-controls').show();
        };

        // Accident hover mouse out event.
        var onMouseOut = function (event) {
            var className = event.target.options.className.split(' ')[0];
            $('.' + className).removeClass('hover-accident');
            event.target.off('mouseout', onMouseOut);
            event.target.on('mouseover', onMouseOver);
        };

        // Accident hover mouse over event.
        var onMouseOver = function (event) {
            var className = event.target.options.className.split(' ')[0];
            $('.' + className).addClass('hover-accident');
            event.target.on('mouseout', onMouseOut);
            event.target.off('mouseover', onMouseOver);
        };

        // Accident onclick event.
        var onClick = function (event) {
          var accidentId = event.target.options.className.split(' ')[0].replace('accident-','');
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

          layer.on('mousemove', function (e) {
            // console.log(e.target.feature.properties, scope.selected);
            showTooltip(e.target.feature.properties, scope.selected, { 'x': event.pageX, 'y': event.pageY });
            e.target.setStyle({
              'fillOpacity': 0.25
            });
          });

          layer.on('mouseout', function (e) {
            hideToolTip();
            e.target.setStyle({
              'fillOpacity': 0
            });
          });

          layer.on('click', filterMap);
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
            boundingBox: formatBoundingBox(boundingBox),
            type: scope.selected,
            properties: event.target.feature.properties
          };

          Socrata(options, 'feature').then(function (result) {
            $('#loader').hide();
            //zoom map to shape.
            //load in all accidents.
            if(result.length > 0) {
              hideToolTip();
              var title = getFeatureContent(scope.activeFeature.properties, scope.selected);
              scope.featuredArea = title;
              $('.yearly-featured').show();
              resetMap(result, title);
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
            setMap(scope.dataset, 14);
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
          var classNames = ['accident-' + accident.unique_key, 'accident-path'];

          if(accident.number_of_persons_killed > 0) {
            classNames.push('death');
          }

          if(accident.number_of_persons_injured > 0) {
            classNames.push('injury');
          }

          if(accident.number_of_persons_killed == 0 && accident.number_of_persons_injured == 0) {
            classNames.push('none-hurt');
          }

          if(accident.hasOwnProperty('contributing_factor_vehicle_1')) {
            classNames.push(scope.getFactorClass(accident.contributing_factor_vehicle_1, 1));
          }

          return classNames.join(' ');
        };

        // Set the accidents on the map. Zoom and center on bounds.
        var setMap = function (dataset, zoom) {
          if(scope.accidentLayer) {
            scope.crashMap.removeLayer(scope.accidentLayer);
          }

          var accidents = L.featureGroup();

          _.forEach(dataset, function (accident) {
              if(accident.latitude && accident.longitude) {
                var marker = L.circleMarker([accident.latitude, accident.longitude], {
                  className: setAccidentClassName(accident),
                  stroke: false,
                  fill: false
                }).setRadius(5);
                marker.on('mouseover', onMouseOver);
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

          // var tiles = L.tileLayer('http://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png',
          // { attribution: '&copy; <a href="http://www.opencyclemap.org">OpenCycleMap</a>, &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>' });

          // var tiles = L.tileLayer('http://openmapsurfer.uni-hd.de/tiles/roadsg/x={x}&y={y}&z={z}', {
          //     attribution: 'Imagery from <a href="http://giscience.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a> &mdash; Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
          // });

          var tiles = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
            maxZoom: 16,
            minZoom: 11
          });
          // var tiles = L.tileLayer('http://{s}.{base}.maps.cit.api.here.com/maptile/2.1/maptile/{mapID}/normal.night.mobile/{z}/{x}/{y}/256/png8?app_id={app_id}&app_code={app_code}', {
          //   attribution: 'Map &copy; 1987-2014 <a href="http://developer.here.com">HERE</a>',
          //   subdomains: '1234',
          //   mapID: 'newest',
          //   app_id: 'TalFdVVqSwdoOWYLFZzk',
          //   app_code: 'dWMkYcqlYDi2p3YFmez3pA',
          //   base: 'base',
          //   minZoom: 11,
          //   maxZoom: 17
          // });

          tiles.addTo(scope.crashMap);
        };

        setMap(scope.dataset, 11);
        setMapTiles();
      }
    };
  }]);
