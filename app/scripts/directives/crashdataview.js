'use strict';

directives.directive('crashDataView', function () {
    return {
      templateUrl: 'partials/crashdataview.html',
      restrict: 'E',
      scope: {
        dataset: '=dataset'
      },
      contoller: directives.crashData,
      controllerAs: 'crashData',
      link: function postLink(scope, element, attrs) {
        //element.text('this is the crashDataView directive');

        var miniMapId = scope.dataset.id;
        var map = element.find('.crash-data-view-map');
        map.attr('id', miniMapId);


        var onMouseOut = function(event) {
            var className = event.target.options.className.split(' ')[0];
            $('.' + className).removeClass('hover-accident');
            event.target.off('mouseout', onMouseOut);
            event.target.on('mouseover', onMouseOver);
        };


        var onMouseOver = function(event) {
            var className = event.target.options.className.split(' ')[0];
            $('.' + className).addClass('hover-accident');
            event.target.on('mouseout', onMouseOut);
            event.target.off('mouseover', onMouseOver);
        };

        // TODO Move popup to an angular directive to show data for crashes with no geolocation data.
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


        var setMiniMap = function (mapElement) {
          //setup a leafletmap.
          var crashMap = L.map(mapElement);

          var accidents = L.featureGroup();

          _.forEach(scope.dataset, function (accident) {
              if(accident.latitude && accident.longitude) {
                var marker = L.circleMarker([accident.latitude, accident.longitude], {
                  className: ['accident-' + accident.unique_key, 'accident_path'].join(' '),
                  stroke: false,
                  fill: false
                });
                marker.on('mouseover', onMouseOver);
                marker.bindPopup(getPopupContent(accident));
                accidents.addLayer(marker);
              }
          });

          var bounds = accidents.getBounds();
          accidents.addTo(crashMap);
          crashMap.setView(bounds.getCenter(), 11);

          var tiles = L.tileLayer('http://{s}.{base}.maps.cit.api.here.com/maptile/2.1/maptile/{mapID}/pedestrian.day/{z}/{x}/{y}/256/png8?app_id={app_id}&app_code={app_code}', {
            attribution: 'Map &copy; 1987-2014 <a href="http://developer.here.com">HERE</a>',
            subdomains: '1234',
            mapID: 'newest',
            app_id: 'TalFdVVqSwdoOWYLFZzk',
            app_code: 'dWMkYcqlYDi2p3YFmez3pA',
            base: 'base',
            minZoom: 11,
            maxZoom: 15
          });

          tiles.addTo(crashMap);
        };

        setMiniMap(map[0]);
      }
    };
  });

directives.crashData = function ($scope, $element, $attrs, $http) {

};

directives.crashData.$inject = ['$scope', '$element', '$attrs', '$http'];
