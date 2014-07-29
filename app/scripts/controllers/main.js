'use strict';

angular.module('nycCrashStatsApp')
  .controller('MainCtrl', ['$scope', 'crashStats', 'Socrata', function ($scope, crashStats, Socrata) {
    crashStats.lastAccidents.title = 'Last ' + crashStats.lastAccidents.length + ' Crashes';
    crashStats.lastAccidents.id = 'accident';
    crashStats.lastInjuries.title = (crashStats.lastInjuries.length >= 100) ? 'Last ' + crashStats.lastInjuries.length + ' Crashes Resulting In An Injury' : 'All Crashes Resulting In An Injury';
    crashStats.lastInjuries.id = 'injury';
    crashStats.lastDeaths.title = (crashStats.lastDeaths.length >= 100) ? 'Last ' + crashStats.lastDeaths.length + ' Crashes Resulting In A Death' : 'All Crashes Resulting In A Death';
    crashStats.lastDeaths.id = 'death';

    $scope.crashStats = crashStats;
    // console.log(crashStats.yearly);
    $scope.yearly = crashStats.yearly[0];
    $scope.factorListSize = 5;
    $scope.hideInstruction = true;

    $scope.setActiveAccident = function (accident, useApply) {
      // console.log(accident);
      if(useApply){
        $scope.$apply(function () {
          $scope.popup = accident;
          $scope.activeAccident = accident;
        });
      } else {
        $scope.activeAccident = accident;
      }

      showDetailCrashPopup(event);
    };

    $scope.showAccidentDetails = function (accidentId, withApply) {
      // console.log(accidentId);
      var accident = getAccident(accidentId);
      console.log('accident', accident);
      if(accident) {
        accident.factors = getAccidentFactors(accident);
        accident.additionalAccidents = getAdditionalAccidents(accident.location);
      }

      if (withApply) {
        $scope.$apply(function () {
          $scope.popup = accident;
        });
      } else {
        $scope.popup = accident;
      }
    };

    $scope.getFactorClass = function (factor) {
      return 'factor-' + factorMap(factor);
    };

    $scope.setNewClass = function () {
      if($scope.newAccidents || $scope.newKills || $scope.newInjuries) {
        return 'col-md-6';
      } else {
        return 'hide';
      }
    };

    // Calculate the yearly totals for the filtered accidents.
    $scope.calculateYearlyStats = function (dataset) {

      var yearlyKeys = _.keys($scope.yearly),
      newYearly = {},
      factorsV1 = [],
      factorsV2 = [];

      _.forEach(yearlyKeys, function (key) {
        if (!newYearly.hasOwnProperty(key)) {
          newYearly[key] = 0;
        }

        newYearly[key] = _.reduce(dataset, function (sum, accident) {
          return sum += parseInt(accident[key], 10);
        }, 0);
      });

      newYearly.total_accidents = dataset.length;
      $scope.yearly = newYearly;
      $scope.factorsVehicle1 = calculateFactorTotals(dataset);
    };

    // $scope.showJumbo = function () {
    //   $('.jumbotron-wrapper').fadeIn();
    //   ga('send', 'event', 'click', 'about');
    // };

    // $scope.hideJumbo = function () {
    //   $('.jumbotron-wrapper').fadeOut();
    // };

    // Handle the click event for the overlay display
    // Community Boards, Neighborhoods, Zip codes etc.
    // Makes the service call to get the correct shape file
    // Calls the display layer function to show the shapes
    $scope.showOverlay = function (type, $event) {
      $('.nav.map-layers li').removeClass('active');
      $($event.target.parentElement).addClass('active');

      if($scope.selected === type) {
        $scope.selected = '';
        $scope.activeType = '';
        $scope.hideInstruction = true;
      } else {
        $scope.activeType = getActiveType(type);
        $scope.hideInstruction = false;
        $scope.selected = type;
      }

      $scope.$broadcast('displayMapOverlay', type);
    };

    var getActiveType = function (type) {
      switch (type) {
        case 'citycouncil':
          return 'City Council District';
        case 'community':
          return 'Community Board District';
        case 'neighborhood':
          return 'neighborhood';
        case 'precinct':
          return 'Police Precinct';
        case 'zipcode':
          return 'zip code';
      }
      return '';
    };

    // Maps the contributing factor text to a css class.
    var factorMap = function (factor) {
      switch(factor.toLowerCase()) {
        case 'uspecified':
          return 'unspecf';
        case 'driver inattention/distraction':
          return 'inattn';
        case 'failure to yield right-of-way':
          return 'fail-yield';
        case 'fatigued/drowsy':
          return 'drowsy';
        case 'backing unsafely':
          return 'backing';
        case 'other vehicular':
          return 'other';
        case 'lost consciousness':
          return 'lost-con';
        case 'pavement slippery':
          return 'slippy';
        case 'prescription medication':
          return 'pres-meds';
        case 'turning improperly':
          return 'turn-imp';
        case 'blank':
          return '';
        case 'blank':
          return 'blank';
        case 'driver inexperience':
          return 'inexp';
        case 'physical disability':
          return 'disable';
        case 'traffic control disregarded':
          return 'disregard';
        case 'outside car distraction':
          return 'distract';
        case 'alcohol involvement':
          return 'booze';
        case 'oversized vehicle':
          return 'wideload';
        case 'passenger distraction':
          return 'pass-distract';
        case 'view obstructed/limited':
          return 'view-obstruct';
        case 'other electronic device':
          return 'electronic-device';
        case 'aggressive driving/road rage':
          return 'road-rage';
        case 'illness':
          return 'ill';
        case 'glare':
          return 'glare';
        case 'brakes defective':
          return 'brake-defect';
        case 'reaction to other uninvolved vehicle':
          return 'react-vehicle';
        case 'obstruction/debris':
          return 'debris';
        case 'failure to keep right':
          return 'fail-right';
        case 'pavement defective':
          return 'pavement-defect';
        case 'fell asleep':
          return 'snooze';
        case 'steering failure':
          return 'steer';
        case 'unsafe speed':
          return 'unsafe-speed';
        case 'drugs (illegal)':
          return 'drugs';
        case 'following too closely':
          return 'tailgate';
        case 'tire failure/inadequate':
          return 'tire-fail';
        case 'lane marking improper/inadequate':
          return 'lane-marking';
        case 'accelerator defective':
          return 'accel-defect';
        case 'traffic control device improper/non-working':
          return 'bad-traffic-device';
        case 'animals action':
          return 'animal';
        case 'unsafe lane changing':
          return 'unsafe-change';
        case 'passing or lane usage improper':
          return 'passing';
        case 'cell phone (hands-free)':
          return 'cell-free';
        case 'pedestrian/bicyclist/other pedestrian error/confusion':
          return 'ped-bike';
        case 'windshield inadequate':
          return 'bad-windshield';
        case 'headlights defective':
          return 'headlight-defect';
        case 'cell phone (hand-held)':
          return 'cell-hand';
        case 'shoulders defective/improper':
          return 'shoulder-defect';
        case 'other lighting defects':
          return 'lighting-defect';
        case 'tow hitch defective':
          return 'hitch-defect';
        default:
          return 'none';
      }
    };

    // get all the factors attached to this accident.
    var getAccidentFactors = function (accident) {
      var factors = [];

      for(var i = 1; i <= 5; i++) {
        if(accident.hasOwnProperty('contributing_factor_vehicle_' + i)) {
          factors.push({
            'factor': accident['contributing_factor_vehicle_'+i]
          });
        }
      }

      return factors;
    };

    // Get the additional accidents at this location in the current dataset.
    var getAdditionalAccidents = function (accidentLocation) {
      var key = 'lastAccidents';

      return _.filter($scope.crashStats[key], function (accident) {
        if(accident.hasOwnProperty('location')) {
          if((accident.location.latitude === accidentLocation.latitude) && (accident.location.longitude === accidentLocation.longitude)) {
            return true;
          }
        }
        return false;
      });
    };

    //Fetch an accident by id.
    var getAccident = function (accidentId) {
        var key = 'lastAccidents';
        accidentId = Number(accidentId);
        return _.find($scope.crashStats[key], function (accident) {
          return (accidentId === accident.unique_key);
        });
    };

    var closeDetailPopup = function () {
      $('#accidentPopup').css('display', 'none');
      $('#accidentPopup .btn-popup-close').off('click', closeDetailPopup);
    };

    var showDetailCrashPopup = function (event) {
      var $$popup = $('#accidentPopup');
      var top = 10;

      $$popup.css({
        'display': 'block',
        'margin-top': top + 'px'
      });

      $('#accidentPopup .btn-popup-close').on('click', closeDetailPopup);
    };

    //Calculate the aggregate factor totals for the filtered accidents. Vehicle 1 only right now.
    var calculateFactorTotals = function (dataset) {
      var factors = {},
        factor = {
          'factor': '',
          'cyclist_injured': 0,
          'cyclist_killed': 0,
          'pedestrians_injured': 0,
          'pedestrians_killed': 0,
          'motorist_injured': 0,
          'motorist_killed': 0,
          'total_accidents': 0,
          'total_injured': 0,
          'total_killed': 0,
        };

      _.forEach(dataset, function (accident) {
        if (accident.hasOwnProperty('contributing_factor_vehicle_1')) {
          var factorName = accident.contributing_factor_vehicle_1.trim();

          if(factorName === '') {
            factorName = 'Blank';
          }
          factors[factorName] = factors[factorName] || {
            'factor': '',
            'cyclist_injured': 0,
            'cyclist_killed': 0,
            'pedestrians_injured': 0,
            'pedestrians_killed': 0,
            'motorist_injured': 0,
            'motorist_killed': 0,
            'total_accidents': 0,
            'total_injured': 0,
            'total_killed': 0,
          };
          factors[factorName].factor = factorName;
          factors[factorName].cyclist_injured += parseInt(accident.number_of_cyclist_injured, 10);
          factors[factorName].cyclist_killed += parseInt(accident.number_of_cyclist_killed, 10);
          factors[factorName].pedestrians_injured += parseInt(accident.number_of_pedestrians_injured, 10);
          factors[factorName].pedestrians_killed += parseInt(accident.number_of_pedestrians_killed, 10);
          factors[factorName].motorist_injured += parseInt(accident.number_of_motorist_injured, 10);
          factors[factorName].motorist_killed += parseInt(accident.number_of_motorist_killed, 10);
          factors[factorName].total_injured += parseInt(accident.number_of_persons_injured, 10);
          factors[factorName].total_killed += parseInt(accident.number_of_persons_killed, 10);
          factors[factorName].total_accidents++;
        }
      });

      factors = _.sortBy(_.toArray(factors), function (factor) {
        return factor.total_accidents;
      });

      var reverseArray = function (initialArray) {
        var len = initialArray.length - 1;
        var i = 0;
        var reversedArray = [];

        while (i <= len) {
          reversedArray[i] = initialArray[len];
          reversedArray[len] = initialArray[i];
          i++;
          len--;
        }
        return reversedArray;
      };

      factors = reverseArray(factors);
      return factors;
    };

    $scope.activeAccident = crashStats.lastAccidents[0];
    $scope.factorsVehicle1 = calculateFactorTotals(crashStats.lastAccidents);
  }]);
