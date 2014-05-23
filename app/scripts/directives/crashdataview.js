'use strict';

directives.directive('crashDataView', ['GeoData', 'Socrata', function (GeoData, Socrata) {
    return {
      templateUrl: 'partials/crashdataview.html',
      restrict: 'E',
      scope: {
        dataset: '=dataset',
        setActiveAccident: '=setaccident'
      },
      link: function postLink(scope, element, attrs) {
        // var gju = require('geojson-utils');
        var miniMapId = scope.dataset.id;
        var map = element.find('.crash-data-view-map');
        map.attr('id', miniMapId);
        scope.crashMap = L.map(map[0]);
        scope.selected = '';

        scope.showOverlay = function (type) {
          //Hide layer if already selected.
          if(scope.selected === type) {
                removeLayer(type);
                scope.selected = '';
                return;
          }

          scope.selected = type;
          switch (type) {
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

        scope.showAccidentDetails = function (unique_key) {
          var $$detailView = $('.accident-detail-' + unique_key);
          $$detailView.toggleClass('vanish');
        };

        var onMouseOut = function (event) {
            var className = event.target.options.className.split(' ')[0];
            $('.' + className).removeClass('hover-accident');
            event.target.off('mouseout', onMouseOut);
            event.target.on('mouseover', onMouseOver);
        };


        var onMouseOver = function (event) {
            var className = event.target.options.className.split(' ')[0];
            $('.' + className).addClass('hover-accident');
            event.target.on('mouseout', onMouseOut);
            event.target.off('mouseover', onMouseOver);
        };

        var onClick = function (event) {
          var accidentId = event.target.options.className.split(' ')[0].replace('accident-','');
          scope.setActiveAccident(accidentId);
            // scope.showAccidentDetails(accidentId);
        };

        var getPopupContent = function (accidentData) {
            var popupContent = [];
            popupContent.unshift('<ul class="accident-details">');
            if(accidentData.borough) {
              popupContent.push('<li class="col-"><span class="accident-borough">' + accidentData.borough.toLowerCase() + ' -</span> <span class="accident-zip-code">' + accidentData.zip_code + '</span></li>');
            }
            if(accidentData.date) {
              popupContent.push('<li>Occured on: ' + accidentData.date.slice(0, accidentData.date.indexOf('T')) + '</li>');
            }
            if(accidentData.on_street_name) {
              popupContent.push('<li class="accident-streets">' + accidentData.on_street_name.toLowerCase() + ' and ' + accidentData.off_street_name.toLowerCase() + '</li>');
            }

            if(accidentData.number_of_persons_injured > 0) {
              popupContent.push('<li class="accident-injury-total">Total Persons injured: ' + accidentData.number_of_persons_injured + '</li>');
            }
            if(accidentData.number_of_persons_killed > 0) {
              popupContent.push('<li class="accident-death-total">Total Persons killed: ' + accidentData.number_of_persons_killed + '</li>');
            }
            if(accidentData.number_of_pedestrians_injured > 0) {
              popupContent.push('<li class="accident-injury">Pedestrians injured: ' + accidentData.number_of_pedestrians_injured + '</li>');
            }
            if(accidentData.number_of_pedestrians_killed > 0) {
              popupContent.push('<li class="accident-death">Pedestrians killed: ' + accidentData.number_of_pedestrians_killed + '</li>');
            }
            if(accidentData.number_of_cyclist_injured > 0) {
              popupContent.push('<li class="accident-injury">Cyclists injured: ' + accidentData.number_of_cyclist_injured + '</li>');
            }
            if(accidentData.number_of_cyclist_killed > 0) {
              popupContent.push('<li class="accident-death">Cyclists killed: ' + accidentData.number_of_cyclist_killed + '</li>');
            }
            if(accidentData.number_of_motorist_injured > 0) {
              popupContent.push('<li class="accident-injury">Motorists injured: ' + accidentData.number_of_motorist_injured + '</li>');
            }
            if(accidentData.number_of_motorist_killed > 0) {
              popupContent.push('<li class="accident-death">Motorists killed: ' + accidentData.number_of_motorist_killed + '</li>');
            }
            if(accidentData.contributing_factor_vehicle_1) {
              popupContent.push('<li class="accident-factor">Contributing Factor Vehicle 1: ' + accidentData.contributing_factor_vehicle_1.toLowerCase() + '</li>');
            }
            if(accidentData.contributing_factor_vehicle_2) {
              popupContent.push('<li class="accident-factor">Contributing Factor Vehicle 2: ' + accidentData.contributing_factor_vehicle_2.toLowerCase() + '</li>');
            }
            if(accidentData.contributing_factor_vehicle_3) {
              popupContent.push('<li class="accident-factor">Contributing Factor Vehicle 3: ' + accidentData.contributing_factor_vehicle_3.toLowerCase() + '</li>');
            }
            if(accidentData.contributing_factor_vehicle_4) {
              popupContent.push('<li class="accident-factor">Contributing Factor Vehicle 4: ' + accidentData.contributing_factor_vehicle_4.toLowerCase() + '</li>');
            }
            if(accidentData.contributing_factor_vehicle_5) {
              popupContent.push('<li class="accident-factor">Contributing Factor Vehicle 5: ' + accidentData.contributing_factor_vehicle_5.toLowerCase() + '</li>');
            }

            popupContent.push('</ul>');
            return popupContent.join('');
        };

        var displayLayer = function (geoJsonData, type) {
          removeAllLayers();
          scope.layers = scope.layers || {};
          if(!scope.layers[type]) {
            scope.layers[type] = L.featureGroup();
            buildMapFeatures(geoJsonData, scope.layers[type]);
          }

          scope.layers[type].addTo(scope.crashMap);
        };

        var buildMapFeatures = function (geoJsonData, layer) {
          _.forEach(geoJsonData.features, function (feature) {
            var geo = L.geoJson(feature, {
              onEachFeature: setFeature
            });
            layer.addLayer(geo);
          });
        };

        var removeLayer = function (type) {
          if(scope.layers && scope.layers[type]) {
            scope.crashMap.removeLayer(scope.layers[type]);
          }
        };

        var removeAllLayers = function () {
          removeLayer('precinct');
          removeLayer('community');
          removeLayer('zipcode');
        };

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

          layer.on('mouseover', function (e) {
            e.target.setStyle({
              'fillOpacity': 0.25
            });
          });

          layer.on('mouseout', function (e) {
            e.target.setStyle({
              'fillOpacity': 0
            });
          });

          layer.on('click', filterMap);
        };

        var filterMap = function (event) {
          var boundingBox = gju.polyBounding(event.target.feature.geometry.coordinates);

          var options = {
            boundingBox: formatBoundingBox(boundingBox),
            type: scope.selected,
            properties: event.target.feature.properties
          };

          Socrata(options, 'feature').then(function (result) {
            //zoom map to shape.
            //load in all accidents.
            resetMap(result);
          });

        };

        var resetMap = function (result) {
            scope.dataset = result;
            scope.selected = null;
            removeAllLayers();
            console.log(result.length);
            setMiniMap(scope.dataset, 13);
        };

        var formatBoundingBox = function (boundingBox) {
          return {
            leftLat: boundingBox[0][0],
            leftLon: boundingBox[0][1],
            rightLat: boundingBox[1][0],
            rightLon: boundingBox[1][1],
          };
        };

        var setMiniMap = function (dataset, initialZoom) {
          if(scope.accidentLayer) {
            scope.crashMap.removeLayer(scope.accidentLayer);
          }

          var accidents = L.featureGroup();

          _.forEach(dataset, function (accident) {
              if(accident.latitude && accident.longitude) {
                var marker = L.circleMarker([accident.latitude, accident.longitude], {
                  className: ['accident-' + accident.unique_key, 'accident_path'].join(' '),
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
          scope.crashMap.setView(bounds.getCenter(), initialZoom);

          var tiles = L.tileLayer('http://{s}.{base}.maps.cit.api.here.com/maptile/2.1/maptile/{mapID}/pedestrian.day/{z}/{x}/{y}/256/png8?app_id={app_id}&app_code={app_code}', {
            attribution: 'Map &copy; 1987-2014 <a href="http://developer.here.com">HERE</a>',
            subdomains: '1234',
            mapID: 'newest',
            app_id: 'TalFdVVqSwdoOWYLFZzk',
            app_code: 'dWMkYcqlYDi2p3YFmez3pA',
            base: 'base',
            minZoom: 11,
            maxZoom: 17
          });

          tiles.addTo(scope.crashMap);
        };

        setMiniMap(scope.dataset, 11);
      }
    };
  }]);

// directives.crashData = function ($scope, $element, $attrs, $http) {

// };

// directives.crashData.$inject = ['$scope', '$element', '$attrs', '$http'];
