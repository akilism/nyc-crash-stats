'use strict';

angular.module('nycCrashStatsApp')
    .controller('MainCtrl', ['$scope', 'crashStats', 'Socrata', function($scope, crashStats, Socrata) {

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

    $scope.setYear = function() {
      // console.log('selectedYears:', $scope.selectedYears);
      if(_.every($scope.selectedYears, function(v,k) { return !v; })) {
        displayHelp();
      } else {
        setTotals(getSelectedYearTotals(yearlyTotals));
      }
    };

    $scope.statGraph = function(item, type) {
      // $scope.items.push(item);

      switch(type) {
        case 'crashes':
          if(item.toLowerCase() === 'death') {
            item = 'result_death';
          } else if(item.toLowerCase() === 'injury') {
            item = 'result_injury';
          } else {
            item = 'total_accidents';
          }
          $scope.items = [item];
          $scope.graphData = getGraphStats($scope.items, type);
          break;
        case 'injuries':
          if(item.toLowerCase() === 'cyclists') {
            item = 'number_of_cyclist_injured';
          } else if(item.toLowerCase() === 'pedestrians') {
            item = 'number_of_pedestrians_injured';
          } else if(item.toLowerCase() === 'motorists') {
            item = 'number_of_motorist_injured';
          } else {
            item = 'number_of_persons_injured';
          }
          $scope.items = [item];
          $scope.graphData = getGraphStats($scope.items, type);
          break;
        case 'deaths':
          if(item.toLowerCase() === 'cyclists') {
            item = 'number_of_cyclist_killed';
          } else if(item.toLowerCase() === 'pedestrians') {
            item = 'number_of_pedestrians_killed';
          } else if(item.toLowerCase() === 'motorists') {
            item = 'number_of_motorist_killed';
          } else {
            item = 'number_of_persons_killed';
          }
          $scope.items = [item];
          $scope.graphData = getGraphStats($scope.items, type);
          break;
        default:
          $scope.items = [item];
          $scope.graphData = getGraphStats($scope.items, type);
      }

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

    var displayHelp = function() {
      console.log('please choose a year.');
    };

    // Begin total calculation functions.

    var compressTotalsByYear = function(totals) {
      var grouped = _.groupBy(totals, function(t) { return t.year; });
      var years = {};
      _.forEach(grouped, function(v, k) {
        years[k] = calculateTotals(v);
      });
      return years;
    };

    var getPctTotal = function(value, total) {
      value = value || 0;
      // console.log(value, total, value/total * 100);
      return (value/total * 100).toPrecision(2);
    };

    var getItemTotals = function (totals) {
      var re = /\//g;

      var accTotal = _.reduce(totals, function(result, total) {
        total = total || 0;
        result += total;
        return result;
      }, 0);

      // console.log('getItemTotals', totals, accTotal);
      return _.sortBy(_.map(totals, function(v, k) {
        return {
          count: v || 0,
          label: k,
          pctTotal: getPctTotal(v, accTotal),
          pctChange: 0
        };
      }), function(item) {
        return -item.count;
      });
    };

    var buildItems = function(totals, type) {
      // console.log('buildItems', totals);
      var formattedItems = [];
      formattedItems[0] = {};
      formattedItems[1] = {};

      switch(type) {
        case 'crash':
          formattedItems[0].count = totals.result_injury;
          formattedItems[0].label = 'Injury';
          formattedItems[0].stickyLabel = 'sticky-label';
          formattedItems[0].icon = '';
          formattedItems[0].showIcon = false;
          formattedItems[1].count = totals.result_death;
          formattedItems[1].label = 'Death';
          formattedItems[1].stickyLabel = 'sticky-label';
          formattedItems[1].icon = '';
          formattedItems[1].showIcon = false;
          break;
        case 'injury':
          formattedItems[2] = {};
          formattedItems[0].count = totals.number_of_pedestrians_injured;
          formattedItems[0].label = 'Pedestrians';
          formattedItems[0].stickyLabel = false;
          formattedItems[0].icon = 'fa fa-user fa-2x';
          formattedItems[0].showIcon = true;
          formattedItems[1].count = totals.number_of_cyclist_injured;
          formattedItems[1].label = 'Cyclists';
          formattedItems[1].stickyLabel = false;
          formattedItems[1].icon = 'fa fa-bicycle fa-2x';
          formattedItems[1].showIcon = true;
          formattedItems[2].count = totals.number_of_motorist_injured;
          formattedItems[2].label = 'Motorists';
          formattedItems[2].stickyLabel = false;
          formattedItems[2].icon = 'fa fa-car fa-2x';
          formattedItems[2].showIcon = true;
          break;
        case 'death':
          formattedItems[2] = {};
          formattedItems[0].count = totals.number_of_pedestrians_killed;
          formattedItems[0].label = 'Pedestrians';
          formattedItems[0].stickyLabel = false;
          formattedItems[0].icon = 'fa fa-user fa-2x';
          formattedItems[0].showIcon = true;
          formattedItems[1].count = totals.number_of_cyclist_killed;
          formattedItems[1].label = 'Cyclists';
          formattedItems[1].stickyLabel = false;
          formattedItems[1].icon = 'fa fa-bicycle fa-2x';
          formattedItems[1].showIcon = true;
          formattedItems[2].count = totals.number_of_motorist_killed;
          formattedItems[2].label = 'Motorists';
          formattedItems[2].stickyLabel = false;
          formattedItems[2].icon = 'fa fa-car fa-2x';
          formattedItems[2].showIcon = true;
          break;
        case 'factors':
          formattedItems = getItemTotals(totals);
          break;
        case 'vehicles':
          formattedItems = getItemTotals(totals);
          break;
      }

      return formattedItems;
    };

    var getTotals = function(totals, type) {
      // console.log('getTotals', totals);
      var formattedTotals = {};

      switch(type) {
        case 'crash':
          formattedTotals.total = totals.total_accidents;
          formattedTotals.title = 'Total Crashes';
          formattedTotals.items = buildItems(totals, 'crash');
          break;
        case 'injury':
          formattedTotals.total = totals.number_of_persons_injured;
          formattedTotals.title = 'Total Injuries';
          formattedTotals.items = buildItems(totals, 'injury');
          break;
        case 'death':
          formattedTotals.total = totals.number_of_persons_killed;
          formattedTotals.title = 'Total Deaths';
          formattedTotals.items = buildItems(totals, 'death');
          break;
        case 'factors':
          formattedTotals.title = 'Contributing Factors';
          formattedTotals.items = buildItems(totals, 'factors');
          break;
        case 'vehicles':
          formattedTotals.total = totals.number_of_persons_killed;
          formattedTotals.title = 'Vehicle Types';
          formattedTotals.items = buildItems(totals, 'vehicles');
          break;
      }

      return formattedTotals;
    };

    //Calculate the aggregate factor totals for the filtered
    //accidents. Vehicle 1 only right now.
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

      return factors.reverse();
    };

    var getSelectedYearsArray = function(selYears) {
      return _.reduce(selYears, function(acc, v, k) {
        if(v) { acc.push(k); }
        return acc;
      },[]);
    };

    //if a single year is selected just return the year
    //otherwise count up all the selected year totals.
    var getSelectedYearTotals = function(yearly) {
      var selectedYears = getSelectedYearsArray($scope.selectedYears);

      if(selectedYears.length === 1) {
        return yearly[selectedYears[0]];
      } else if (selectedYears.length > 1) {
        return calculateTotals(
          _.filter(yearly, function(v, k) { return _.contains(selectedYears, k); })
        );
      } else {
        return [];
      }
    };

    //count up all the yearly totals.
    var calculateTotals = function(data) {
      return _.reduce(data, function(acc, curr) {
        if(!acc) { return curr; }
        var totals = {};
        _.forEach(curr, function(v, k) {
          // console.log(acc[k], v, k);
          if(k === 'year' || k === 'month') { totals[k] = v; }
          else { totals[k] = getTotal(acc[k], v); }
        });
        return totals;
      }, false);
    };

    var getTotal = function(acc, curr) {
      if(!acc) { return curr; }
      if(_.isObject(curr)) { return calculateTotals([acc, curr]); }
      if(_.isNaN(acc)) { return curr; }
      if(_.isNaN(curr)) { return acc; }
      return acc+curr;
    };

    var setTotals = function(selectedYearTotals) {
      // console.log('selectedYearTotals', selectedYearTotals);
      if(selectedYearTotals) {
        $scope.crashStats.crashTotals = getTotals(selectedYearTotals, 'crash');
        $scope.crashStats.injuryTotals = getTotals(selectedYearTotals, 'injury');
        $scope.crashStats.deathTotals = getTotals(selectedYearTotals, 'death');
        $scope.crashStats.factorTotals = getTotals(selectedYearTotals.factors, 'factors');
        $scope.crashStats.vehicleTotals = getTotals(selectedYearTotals.vehicles, 'vehicles');
      } else {
        displayHelp();
      }
    };

    // End total calculation functions.
    var getDisplayValue = function(item) {
      switch(item) {
        case 'number_of_cyclist_injured':
          return 'total cyclists injured';
        case 'number_of_cyclist_killed':
          return 'total cyclists killed.';
        case 'number_of_motorist_injured':
          return 'total motorists injured.';
        case 'number_of_motorist_killed':
          return 'total motorists killed.';
        case 'number_of_pedestrians_injured':
          return 'total pedestrians injured.';
        case 'number_of_pedestrians_killed':
          return 'total pedestrians killed.';
        case 'number_of_persons_injured':
          return 'total persons injured.';
        case 'number_of_persons_killed':
          return 'total persons killed.';
        case 'result_death':
          return 'crashes resulting in a death.';
        case 'result_injury':
          return 'crashes resulting in an injury.';
        case 'total_accidents':
          return 'total crashes.';
      }
    };

    var getGraphStats = function(items, type) {
      //month/year total
      var totals = {};
      _.forEach(_.filter(crashStats.totals, function(total) {
        return _.contains(getSelectedYearsArray($scope.selectedYears), total.year + '');
      }), function(total) {
        if(type === 'crashes' || type === 'injuries' || type === 'deaths') {
          var display = getDisplayValue(items[0]);
          totals[total.month + '_' + total.year] = {
            'totals': {},
            year: total.year,
            month: total.month
          };
          totals[total.month + '_' + total.year].totals[display] = total[items[0]];
        } else {
          totals[total.month + '_' + total.year] = {
            'totals': getTypeTotals(total[type], items),
            year: total.year,
            month: total.month
          };
        }
      });
      return totals;
    };

    var getTypeTotals = function(typeTotal, items) {
      var totals = {};
      _.forEach(items, function(item) {
         totals[item] = (_.filter(typeTotal, function(v, key) { return key === item; }))[0];
      });
      return totals;
    };


    var yearlyTotals = compressTotalsByYear(crashStats.totals);
    var d = new Date();
    var statDate = _.reduce(_.map(_.keys(crashStats.totals), function(key){
      var parts = key.split('_');
      return parts[1];
    }), function(hi, curr, i) {
      return Math.max(hi, parseInt(curr, 10));
    }, 0);

    $scope.crashStats = _.cloneDeep(crashStats);
    $scope.selectedYears = {};
    $scope.selectedYears[Math.min(statDate, d.getFullYear())] = true;
    setTotals(getSelectedYearTotals(yearlyTotals));
    $scope.factorListSize = 5;
    $scope.hideInstruction = true;
    $scope.factorsVehicle1 = calculateFactorTotals(crashStats.lastAccidents);
    $scope.items = [];
    $scope.graphData = {};
  }]);
