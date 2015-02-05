'use strict';

angular.module('nycCrashStatsApp')
  .controller('TrendCtrl', ['$scope', '$location', 'trendStats', 'Socrata', 'GeoData', function ($scope, $location, trendStats, Socrata, GeoData) {

    $scope.selectedYears = {};
    $scope.selectedYears['2015'] = true;
    $scope.keys = [];
    $scope.storedYears = [];
    $scope.distinctLocations = {};
    $scope.range = {};
    $scope.fitDates = false;
    $scope.dateRange = null;
    $scope.hoverCrash = {};

    $scope.getButtonVal = function (key, year, visible) {
      if (year && $scope.groupStats.hasOwnProperty(year)) {
        return parseInt($scope.groupStats[year].totals[key], 10);
      } else if (year && !$scope.groupStats.hasOwnProperty(year)) {
        return 0;
      } else {
        var total = 0;
        _.forOwn($scope.groupStats, function (yearData) {
          total = total + parseInt(yearData.totals[key], 10);
        });
        return total;
      }
    };

    $scope.setOption = function (range, key) {
      switch(range) {
        case 'year':
          groupByYear();
          break;
        case 'month':
          break;
        case 'week':
          break;
        default:
          break;
      }
    };

    var displayYear = function (validYears, currentYears) {
      var yearToFetch = _.difference(validYears, currentYears)[0];

      if(yearToFetch) {
        ga('send', 'event', 'fetchYear', yearToFetch);
        if($scope.storedYears.hasOwnProperty(yearToFetch + '')) {
          var stats = $scope.groupStats;
          stats[yearToFetch] = $scope.storedYears[yearToFetch];
          $scope.groupStats = null;
          $scope.groupStats = stats;

          $scope.unConstrainedStats[yearToFetch] = $scope.storedYears[yearToFetch];

          updateGraph();
        } else {
          fetchYear(yearToFetch);
        }
      }
    };

    $scope.setYear = function () {
      var validYears = getValidYears();
      var currentYears = _.keys($scope.groupStats);
      // $('.key-item').removeClass('active');
      // $('.key-item.total_accidents').addClass('active');
      var yearToCut = _.difference(currentYears, validYears)[0];
      if(yearToCut) {
        ga('send', 'event', 'cutYear', yearToCut);
        cutYear(yearToCut);
        return;
      }

      displayYear(validYears, currentYears);
    };

    var setAccidents = function (selector) {
      // console.log(selector);
      $('.location-path' + selector).css('display', 'block');
      $('.location-path').not(selector).css('display', 'none');
    };

    $scope.switchGraph = function (key, $event) {
      $scope.graphKey = key;
      $scope.graphHeader = getHeader(key, $scope.title);
      $('.key-item').removeClass('active');
      // console.log($event);
      $($event.currentTarget).addClass('active');
      // console.log(key);
      ga('send', 'event', 'switchGraph', key);
      switchOnKey(key);
    };

    $scope.getFactorClass = function (factor) {
      return 'factor-' + factorMap(factor);
    };

    $scope.showAccidentDetails = function (accidentId, withApply) {
      // console.log(accidentId);
      var accident = getAccident(accidentId);
      ga('send', 'event', 'showAccidentDetails', accidentId);
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

    //Use only overlapping dates or all dates.
    $scope.setDates = function (loadMap) {
      if($scope.fitDates === true) {
        // console.log('calling overlapdates()');
        overlapDates();
        ga('send', 'event', 'setDates', 'overlap');
      } else {
        // console.log('calling showalldates()');
        showAllDates();
        ga('send', 'event', 'setDates', 'showAll');
      }

      if (loadMap) {
        updateGraph();
      }
    };

    var switchOnKey = function (key) {
      switch(key){
        case 'number_of_persons_injured':
          setAccidents('.injured');
          break;
        case 'number_of_persons_killed':
          setAccidents('.killed');
          break;
        case 'number_of_cyclist_injured':
          setAccidents('.cycl_injured');
          break;
        case 'number_of_cyclist_killed':
          setAccidents('.cycl_killed');
          break;
        case 'number_of_motorist_injured':
          setAccidents('.moto_injured');
          break;
        case 'number_of_motorist_killed':
          setAccidents('.moto_killed');
          break;
        case 'number_of_pedestrians_injured':
          setAccidents('.ped_injured');
          break;
        case 'number_of_pedestrians_killed':
          setAccidents('.ped_killed');
          break;
        default:
          $('.location-path').css('display', 'block');
          break;
      }
    };

    var getMinMaxDate = function () {
      var minDates = [],
          maxDates = [];

      var selectedYears = [];

      _.forOwn($scope.selectedYears, function(val, key) {
        if (val === true) { selectedYears.push(Number(key)); }
      });

      _.forOwn($scope.groupStats, function (year, key) {
        var fullYear = $scope.range[Number(key)].minDate.getFullYear();
        if (_.contains(selectedYears, fullYear)){
          minDates.push($scope.range[Number(key)].minDate);
        }
      });

       _.forOwn($scope.groupStats, function (year, key) {
        var fullYear = $scope.range[Number(key)].maxDate.getFullYear();
        // console.log(_.contains(selectedYears, fullYear), fullYear);
        if (_.contains(selectedYears, fullYear)){
          maxDates.push($scope.range[Number(key)].maxDate);
        }
      });

      minDates = _.sortBy(minDates, function (date) {
        return date;
      });

      maxDates = _.sortBy(maxDates, function (date) {
        return date;
      });

      return {
        min: minDates[0],
        max: maxDates[maxDates.length-1]
      };
    };

    var overlapDates = function () {
      var numSelectedYears = _.filter($scope.selectedYears, function (year) {
        return year;
      }).length;
      if(numSelectedYears <= 1) { $scope.dateRange = null; return; }

      var date = getMinMaxDate();
      $scope.dateRange = date;
      $scope.groupStats = null;
      $scope.groupStats = groupData(trendStats.accidents, date);
    };

    var showAllDates = function () {
      $scope.dateRange = null;
      $scope.groupStats = null;
      $scope.groupStats = {};
      $scope.groupStats = groupData(trendStats.accidents);
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

    var closeDetailPopup = function () {
      $('#accidentPopup').css('display', 'none');
      $('#accidentPopup .btn-popup-close').off('click', closeDetailPopup);
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

    var cutYear = function (yearToCut) {
      var cutYear = $scope.unConstrainedStats[yearToCut];
      // console.log($scope.groupStats.hasOwnProperty(yearToCut), $scope.groupStats);
      delete $scope.groupStats[yearToCut];
      delete $scope.unConstrainedStats[yearToCut];
      $scope.storedYears[yearToCut] = cutYear;

      updateGraph();
    };

    var fetchYear = function (yearToFetch) {
      var $$yearSelector = $('.year-selector');
      $$yearSelector.css('visibility', 'hidden');
      flipDisplay('.trend-left', '.loader');
      getYearlyAccidents(yearToFetch).then(function (crashes) {
        trendStats.accidents = trendStats.accidents.concat(crashes.accidents);
        var groupedCrashes = groupData(crashes.accidents);
        var year = _.keys(groupedCrashes);
        var stats = $scope.groupStats;
        stats[yearToFetch] = groupedCrashes[yearToFetch];
        $scope.groupStats = null;
        $scope.groupStats = stats;
        $scope.unConstrainedStats[yearToFetch] = groupedCrashes[yearToFetch];
        crashes = null;

        updateGraph();

        $$yearSelector.css('visibility', 'visible');
        flipDisplay('.loader', '.trend-left');
      });
    };

    var updateGraph = function () {
      $scope.setDates(false);
      setDistinctLocations($scope.groupStats);
      setMap($scope.distinctLocations, $scope.selectedArea, 14);
      setMapTiles();
      switchOnKey($scope.graphKey);
      $scope.$broadcast('updateGraph');
    };

    var flipDisplay = function(hide, show) {
      $(hide).animate({'opacity': 0}, 250, function () {
          $(hide).css('display', 'none');
          $(show).css('display', 'block').animate({'opacity': 1}, 250);
        });
    };

    var getYearlyAccidents = function (year) {
      var path = $location.$$path.split('/');
      // console.log(year);

      var options = {
        'type': path[1],
        'value': path[2],
        'year': year + '-01-01'
      };

      return Socrata(options, 'daily');
    };

/*
    var getAllShapes = function () {
      GeoData('/all').then(function (data) {
        // console.log(data);

        _.forEach(data, function (shape) {
          shape.name = getDisplayValue(shape.type, shape.identifier, false);
        });

        // $scope.shapes = data;

        $scope.menuData = buildMenu(data);
      });
    };

    var buildMenu = function (data) {
      var types = _.uniq(_.pluck(data, 'type'));
      var menuData = {};

      _.forEach(types, function (type) {
        menuData[type] = {
          'name': getDisplayValue(type, null, false),
          'children': null,
          'isLeaf': true,
          'type': type
        };

        var filteredVals = _.filter(data,  { 'type': type });

        // console.log(filteredVals);

        var boroughLevelData = {};

        _.forEach(filteredVals, function (val) {
          _.assign(val, {'isLeaf': true});

          if (val.type === 'community') {
            _.assign(val, {'borough': getDistrictBorough(parseInt(val.identifier, 10))});
          }
        });

        if (filteredVals[0].hasOwnProperty('borough')) {
          boroughLevelData = groupByBorough(filteredVals);
        }

        if (_.keys(boroughLevelData).length > 0) {
          menuData[type].children = boroughLevelData;
          menuData[type].isLeaf = false;
        } else {
          var sortedVals = _.sortBy(filteredVals, sortVals);
          menuData[type].children = sortedVals;
          menuData[type].isLeaf = false;
        }
      });
      // console.log('menuData : ', menuData);
      return menuData;
    };

    var getDistrictBorough = function (districtId) {
      if (districtId > 500) {
        return 'Staten Island';
      } else if (districtId > 400) {
        return 'Queens';
      } else if (districtId > 300) {
        return 'Brooklyn';
      } else if (districtId > 200) {
        return 'Bronx';
      } else if (districtId > 100) {
        return 'Manhattan';
      } else {
        return '';
      }
    };

    var groupByBorough = function (data) {
      var boroughs = _.uniq(_.pluck(data, 'borough'));
      var boroughData = {};

      _.forEach(boroughs, function (borough) {
        boroughData[borough] = {
          'name': borough,
          'children': null,
          'isLeaf': false,
          'type': borough.toLowerCase().replace(' ', '')
        };

        var filteredVals = _.filter(data,  { 'borough': borough });

        _.forEach(filteredVals, function (val) {
          _.assign(val, {'isLeaf': true});
        });

        var sortedVals = _.sortBy(filteredVals, sortVals);

        boroughData[borough].children = sortedVals;

      });

      return boroughData;
    };

    var sortVals = function (val) {
      if (isNaN(parseInt(val.identifier, 10))) {
        return val.identifier;
      } else {
        return parseInt(val.identifier, 10);
      }
    };
*/
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

    var communityBoardDisplay = function (id) {
      return translateCommunityBoardDistrict(parseInt(id, 10));
    };

    var precinctDisplay = function (id) {
      var precinct = parseInt(id, 10);
      if(precinct === 14) { return 'Midtown South Police Precinct'; }
      if(precinct === 18) { return 'Midtown North Police Precinct'; }
      if(precinct === 22) { return 'Central Park Police Precinct'; }
      return addOrdinal(precinct) + ' Police Precinct';
    };

    var getMenuName = function (type) {
      switch (type) {
        case 'citycouncil':
          return 'City Council';
        case 'community':
          return 'Community Board';
        case 'zipcode':
          return 'Zip Code';
        case 'precinct':
          return 'Police Precinct';
        case 'neighborhood':
          return 'Neighborhood';
        case 'borough':
          return 'Borough';
      }
    };

    var getDisplayValue = function (type, value, isTitle) {

      if(!value) {
        return getMenuName(type);
      }

      switch (type) {
        case 'zipcode':
          return (isTitle) ? ' in zip code ' + value + '.' : 'Zip Code ' + value;
        case 'neighborhood':
          return (isTitle) ? ' in ' + value + '.' : value;
        case 'citycouncil':
          return (isTitle) ? ' in city council district ' + value + '.' : 'City Council District ' + value;
        case 'community':
          return (isTitle) ? ' in ' + communityBoardDisplay(value) + '.' : communityBoardDisplay(value);
        case 'borough':
          return (isTitle) ? ' in ' + value + '.' : value + '';
        case 'precinct':
          return (isTitle) ? ' in the ' + precinctDisplay(value) + '.' : precinctDisplay(value) + '';
      }
    };

    var getTitle = function (path, isGraphTitle) {
      if(path.toLowerCase().indexOf('trend') !== -1) {
        return 'city wide.';
      }

      var parts = path.split('/');
      var type = parts[1];
      var value = parts[2];

      return getDisplayValue(type, value, isGraphTitle);
    };

    var addNewYear = function (crash, currentDate) {
      var year = {
        'totals': {},
        'months': {}
      };

      year.months[crash.date.getMonth()] = {
        'totals': {},
        'days': {},
        'date': crash.date

      };

      year.months[crash.date.getMonth()]
      .days[currentDate] = {
        'totals': {},
        'crashes': [crash],
        'date': crash.date
      };

      return year;
    };

    var addNewMonth = function (crash, currentDate) {
      var month = {
        'totals': {},
        'days': {},
        'date': crash.date
      };

      month.days[currentDate] = {
        'totals': {},
        'crashes': [crash],
        'date': crash.date
      };

      return month;
    };

    var isValidDate = function(dateRange, date) {
      var day = date.getDate();
      var month = date.getMonth();

      return ((month >= dateRange.min.getMonth() && day >= dateRange.min.getDate()) &&
        (month <= dateRange.max.getMonth() && day <= dateRange.max.getDate()));
    };

    var groupData = function (crashData, dateRange) {
      // if(dateRange) { console.log(dateRange); }
      // console.log(crashData.length, dateRange);
      var currentDate, currentMonth, currentYear;
      var years = {};
      var validYears = getValidYears();

      _.forEach(crashData, function (crash) {

        if(!_.isDate(crash.date)) {
          crash.date = new Date(crash.date.trim());
        }

        if(dateRange && !isValidDate(dateRange, crash.date)) {
          return;
        }

        if(crash.location) {
          crash.latitude = crash.location.latitude;
          crash.longitude = crash.location.longitude;
        }

        //Group the data by year -> month -> day
        crash.year = crash.date.getFullYear();
        currentMonth = crash.date.getMonth();
        currentYear = crash.date.getFullYear();
        currentDate = crash.date.getDay() + '-' + currentMonth + '-' + currentYear;

        if(!_.contains(validYears, crash.year + '')) {
          return;
        }

        if(!currentYear || !years.hasOwnProperty(currentYear)) {
          //New year.
          if(!$scope.range.hasOwnProperty(currentYear)) {$scope.range[currentYear] = {}; }
          years[currentYear] = addNewYear(crash, currentDate);
        } else if (!years[currentYear].months.hasOwnProperty(currentMonth)) {
          // New month.
          years[currentYear].months[currentMonth] = addNewMonth(crash, currentDate);
        } else if (!years[currentYear].months[currentMonth].days.hasOwnProperty(currentDate)) {
          // New day
          years[currentYear]
          .months[currentMonth]
          .days[currentDate] = {
            'totals': {},
            'crashes': [crash],
            'date': crash.date
          };
        } else {
          years[currentYear].months[currentMonth].days[currentDate].crashes.push(crash);
        }

        if(currentYear) {
          if(!dateRange) {
            if(!$scope.range[currentYear].minDate || $scope.range[currentYear].minDate > crash.date) {
              // years[currentYear].minDate = crash.date;
              $scope.range[currentYear].minDate = crash.date;
            }

            if(!$scope.range[currentYear].maxDate || $scope.range[currentYear].maxDate < crash.date) {
              // years[currentYear].maxDate = crash.date;
              $scope.range[currentYear].maxDate = crash.date;
            }
          }
          var currentDayTotal = years[currentYear].months[currentMonth].days[currentDate].totals;
          years[currentYear].months[currentMonth].days[currentDate].totals = addToTotals(currentDayTotal, crash);

          var currentMonthTotal = years[currentYear].months[currentMonth].totals;
          years[currentYear].months[currentMonth].totals = addToTotals(currentMonthTotal, crash);

          var currentYearTotal = years[currentYear].totals;
          years[currentYear].totals = addToTotals(currentYearTotal, crash);
        }
      });
      // console.log('years', years);
      // console.log($scope.groupStats);
      return years;
    };

    var addToScope = function (key) {
      if($scope.keys.indexOf(key) === -1) {
        $scope.keys.push(key);
      }

      $scope.keys = $scope.keys.sort();
    };

    var getValidYears = function () {
      var validYears = [];
      _.forOwn($scope.selectedYears, function (val, key) {
        if(val) {
          validYears.push(key);
        }
      });
      return validYears;
    };

    var addToTotals = function (prevTotals, crash) {
      var newTotals = {};

      _.forOwn(crash, function (val, key) {
        if(key.indexOf('number_of') !== -1) {
          val = parseInt(val, 10);
          if(prevTotals.hasOwnProperty(key)) {
            newTotals[key] = prevTotals[key] + val;
          } else {
            newTotals[key] = val;
          }

          addToScope(key);
        }
      });
      newTotals.total_accidents = (prevTotals.hasOwnProperty('total_accidents')) ? prevTotals.total_accidents + 1 : 1;
      addToScope('total_accidents');
      return newTotals;
    };

    var groupByYear = function () {

      var yearlyTotal = {};

      _.forEach(distinctYears, function (year) {
        yearlyTotal[year] = [];
        var days = _.filter(datedStats, {'year': year});
        yearlyTotal[year] = groupMonths(days);
      });

      return yearlyTotal;
    };

    var groupMonths = function (allDays) {
      var months = {};
      var month;
      _.forEach(allDays, function (day) {
        month = day.date.getMonth(); //day.date.toLocaleString('en-us', {'month': 'short'});

        if(!months.hasOwnProperty(month)) {
          months[month] = [];
        }
        months[month].push(day);
      });

      return months;
    };

    var getYearlyTotal = function (data) {
      return _.reduce(data, function (sum, num) {
        _.forOwn(num, function (val, key) {
          var intVal = parseInt(val, 10);
          if (!isNaN(intVal)) {

            sum[key] = parseInt(sum[key], 10) + intVal;
          }
        });
        return sum;
      });
    };

    var getMonthlyTotals = function (data) {
      var totals = _.reduce(data, function (sum, day) {
        if(!sum) {
          sum = day;
        } else {
          _.forOwn(day, function (val, key) {
            if(key !== 'date' && key !== 'year') {
              sum[key] = parseInt(val, 10) + parseInt(sum[key], 10);
            }
          });
        }

         return sum;
      });

      return totals;
    };

    var groupByMonth = function () {
      var year, month;
      var monthlyData = {};

      var filterFunc = function (day) {
        // console.log(day.date);
        if(day.date.getFullYear() === year && day.date.getMonth() === month) {
          return true;
        }
      };

      _.forEach(distinctYears, function (currYear) {
        year = currYear;
        var months = [];
        for(var i = 0; i < 12; i++) {
          month = i;
          var days = _.filter(datedStats, filterFunc);
          if(days.length > 0) {
            months.push(getMonthlyTotals(days));
          }
        }

        monthlyData[year] = months;
      });

      return monthlyData;
    };

    var getHeader = function (key, title) {
      if (key === 'total_accidents') {
        return 'Total crashes ' + title;
      } else {
        var re = /_/g;
        return 'Total ' + key.replace(re, ' ') + ' ' + title;
      }
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

     $scope.layers[type].addTo($scope.crashMap);
    };

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
      var validAccidents = [];
       _.forEach(trendStats.accidents, function (accident) {
        if (accident.latitude === location.latitude && accident.longitude === location.longitude) {
          validAccidents.push(accident);
        }
      });
      return groupData(validAccidents, $scope.dateRange);
    };

     // Set the accidents on the map. Zoom and center on bounds.
    var setMap = function (locations, shapes, zoom) {
      var crashLocations = ($scope.hasOwnProperty('crashLayer')) ? $scope.crashLayer : L.featureGroup();
      // console.log('crashlocations:', crashLocations);
      crashLocations.clearLayers();

      if(shapes.length > 0 && !$scope.shapeSet) {
        displayLayer({'features': shapes}, 'active');
        $scope.shapeSet = true;
      }

      var getR = function (location) {
        var r = Math.floor(location.crashIds.length/2) + 2;
        return (r > 20) ? 20 : r;
      };

      _.forOwn(locations, function (location) {
          if(location.location.latitude && location.location.longitude) {
            var marker = L.circleMarker([location.location.latitude, location.location.longitude], {
              className: setLocationClassName(location),
              stroke: false,
              fill: false
            }).setRadius(getR(location));
            // marker.on('click', onClick);

            // marker.bindPopup(getPopupContent(accident));
            marker.tooltipData = {};
            marker.tooltipData.crashes = getTooltipCrashes(location.location);
            marker.tooltipData.on_street_name = location.on_street_name;
            marker.tooltipData.off_street_name = location.off_street_name;
            marker.on('mousemove', onHoverCrash);
            marker.on('mouseout', onOutCrash);
            crashLocations.addLayer(marker);
          }
      });

      $scope.crashLayer = crashLocations;

      crashLocations.addTo($scope.crashMap);
      if(_.size(locations) > 0) {
        var bounds = crashLocations.getBounds();
        $scope.crashMap.setView(bounds.getCenter(), zoom);
      }
    };

    var setMapTiles = function () {

      var tiles = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16,
        minZoom: 11
      });

      tiles.addTo($scope.crashMap);
    };

    var setDistinctLocations = function (crashes) {
      $scope.distinctLocations = {};

      _.forOwn(crashes, function (year) {
        _.forOwn(year.months, function (month) {
          _.forOwn(month.days, function (day) {
            _.forEach(day.crashes, function (crash) {
              //setup the distinct locations in the dataset to assist mapping crashes.
              var crashKey = crash.longitude + ',' + crash.latitude;
              if(!$scope.distinctLocations.hasOwnProperty(crashKey)) {
                $scope.distinctLocations[crashKey] = {};
                $scope.distinctLocations[crashKey].crashIds = [];
                $scope.distinctLocations[crashKey].factors = [];
                $scope.distinctLocations[crashKey].location = crash.location;
                $scope.distinctLocations[crashKey].off_street_name = crash.off_street_name;
                $scope.distinctLocations[crashKey].on_street_name = crash.on_street_name;
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
          });
        });
      });
    };

    $scope.crashMap = L.map('trendMap');

    var distinctYears = _.uniq(_.pluck(datedStats, 'year'));

    var datedStats = _.forEach(trendStats.accidents, function(day) {
      if(!_.isDate(day.date)) {
        day.date = new Date(day.date.trim());
      }

      day.year = day.date.getFullYear();
    });

    var options = [
      {
        'name': 'Total Crashes',
        'key': 'total_accidents'
      },
      {
        'name': 'Total Injuries',
        'key': 'total_injured'
      },
      {
        'name': 'Total Killed',
        'key': 'total_killed'
      },
    ];

    // getAllShapes();

    $scope.graphKey = 'total_accidents';
    $scope.title = getTitle($location.$$path, false);
    // console.log(trendStats.accidents);
    $scope.groupStats = groupData(trendStats.accidents);
    // console.log($scope.groupStats);
    $scope.unConstrainedStats = _.clone($scope.groupStats);
    // console.log($scope.unConstrainedStats);
    $scope.shapes = trendStats.shapes;
    $scope.graphHeader = 'Total crashes ' + getTitle($location.$$path, true);
    $scope.selectedArea = trendStats.shapes;

    updateGraph();
  }
]);
