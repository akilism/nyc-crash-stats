'use strict';

angular.module('nycCrashStatsApp')
  .controller('MainCtrl', ['$scope', 'crashStats', 'Socrata', function ($scope, crashStats, Socrata) {
    crashStats.lastAccidents.title = 'Last ' + crashStats.lastAccidents.length + ' Accidents';
    crashStats.lastAccidents.id = 'accident';
    crashStats.lastInjuries.title = (crashStats.lastInjuries.length >= 100) ? 'Last ' + crashStats.lastInjuries.length + ' Accidents Resulting In An Injury' : 'All Accidents Resulting In An Injury';
    crashStats.lastInjuries.id = 'injury';
    crashStats.lastDeaths.title = (crashStats.lastDeaths.length >= 100) ? 'Last ' + crashStats.lastDeaths.length + ' Accidents Resulting In A Death' : 'All Accidents Resulting In A Death';
    crashStats.lastDeaths.id = 'death';

    $scope.crashStats = crashStats;
    $scope.yearly = crashStats.yearly[0];
    $scope.factorListSize = 5;

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

      yearlyKeys.push('persons_killed');
      yearlyKeys.push('persons_injured');


      _.forEach(yearlyKeys, function (key) {
        if (!newYearly.hasOwnProperty(key)) {
          newYearly[key] = 0;
        }

        newYearly[key] = _.reduce(dataset, function (sum, accident) {
          return sum += parseInt(accident['number_of_' + key], 10);
        }, 0);
      });

      newYearly.total_injured = newYearly.persons_injured;
      newYearly.total_killed = newYearly.persons_killed;
      newYearly.total_accidents = dataset.length;
      $scope.yearly = newYearly;
      $scope.factorsVehicle1 = calculateFactorTotals(dataset);
    };

    $scope.showJumbo = function () {
      $('.jumbotron-wrapper').show();
      ga('send', 'event', 'click', 'about');
    };

    $scope.hideJumbo = function () {
      $('.jumbotron-wrapper').hide();
    };

    // Maps the contributing factor text to a css class.
    var factorMap = function (factor) {
      switch(factor) {
        case 'Uspecified':
          return 'unspecf';
        case 'Driver Inattention/Distraction':
          return 'inattn';
        case 'Failure to Yield Right-of-Way':
          return 'fail-yield';
        case 'Fatigued/Drowsy':
          return 'drowsy';
        case 'Backing Unsafely':
          return 'backing';
        case 'Other Vehicular':
          return 'other';
        case 'Lost Consciousness':
          return 'lost-con';
        case 'Pavement Slippery':
          return 'slippy';
        case 'Prescription Medication':
          return 'pres-meds';
        case 'Turning Improperly':
          return 'turn-imp';
        case 'blank':
          return '';
        case 'Blank':
          return 'blank';
        case 'Driver Inexperience':
          return 'inexp';
        case 'Physical Disability':
          return 'disable';
        case 'Traffic Control Disregarded':
          return 'disregard';
        case 'Outside Car Distraction':
          return 'distract';
        case 'Alcohol Involvement':
          return 'booze';
        case 'Oversized Vehicle':
          return 'wideload';
        case 'Passenger Distraction':
          return 'pass-distract';
        case 'View Obstructed/Limited':
          return 'view-obstruct';
        case 'Other Electronic Device':
          return 'electronic-device';
        case 'Aggressive Driving/Road Rage':
          return 'road-rage';
        case 'Illness':
          return 'ill';
        case 'Glare':
          return 'glare';
        case 'Brakes Defective':
          return 'brake-defect';
        case 'Reaction to Other Uninvolved Vehicle':
          return 'react-vehicle';
        case 'Obstruction/Debris':
          return 'debris';
        case 'Failure to Keep Right':
          return 'fail-right';
        case 'Pavement Defective':
          return 'pavement-defect';
        case 'Fell Asleep':
          return 'snooze';
        case 'Steering Failure':
          return 'steer';
        case 'Unsafe Speed':
          return 'unsafe-speed';
        case 'Drugs (Illegal)':
          return 'drugs';
        case 'Following Too Closely':
          return 'tailgate';
        case 'Tire Failure/Inadequate':
          return 'tire-fail';
        case 'Lane Marking Improper/Inadequate':
          return 'lane-marking';
        case 'Accelerator Defective':
          return 'accel-defect';
        case 'Traffic Control Device Improper/Non-Working':
          return 'bad-traffic-device';
        case 'Animals Action':
          return 'animal';
        case 'Unsafe Lane Changing':
          return 'unsafe-change';
        case 'Passing or Lane Usage Improper':
          return 'passing';
        case 'Cell Phone (hands-free)':
          return 'cell-free';
        case 'Pedestrian/Bicyclist/Other Pedestrian Error/Confusion':
          return 'ped-bike';
        case 'Windshield Inadequate':
          return 'bad-windshield';
        case 'Headlights Defective':
          return 'headlight-defect';
        case 'Cell Phone (hand-held)':
          return 'cell-hand';
        case 'Shoulders Defective/Improper':
          return 'shoulder-defect';
        case 'Other Lighting Defects':
          return 'lighting-defect';
        case 'Tow Hitch Defective':
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
      var index = 'lastAccidents';

      //make true socrata api call for this.

      return _.filter($scope.crashStats[index], function (accident) {
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
        var index = 'lastAccidents';

        return _.find($scope.crashStats[index], function (accident) {
          if(accidentId === accident.unique_key) {
            return true;
          }
          return false;
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
