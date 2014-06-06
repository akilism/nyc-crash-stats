'use strict';

angular.module('nycCrashStatsApp')
  .controller('TrendCtrl', ['$scope', '$location', 'trendStats', 'Socrata', 'GeoData', function ($scope, $location, trendStats, Socrata, GeoData) {

    var getAllShapes = function () {
      GeoData('/all').then(function (data) {
        _.forEach(data, function (shape) {
          shape.name = getDisplayValue(shape.type, shape.identifier, false);
        });

        $scope.shapes = data;
      });
    };

    getAllShapes();

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

    var getDisplayValue = function (type, value, isTitle) {
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

    var getTitle = function (path) {
      if(path.toLowerCase().indexOf('trend') !== -1) {
        return 'city wide.';
      }

      var parts = path.split('/');
      var type = parts[1];
      var value = parts[2];

      return getDisplayValue(type, value, true);
    };


    $scope.title = getTitle($location.$$path);

    //The slice(1) is because the first month in the dataset is incomplete.
    var datedStats = _.forEach(trendStats, function(day) {
      day.date = new Date(day.date);
      day.year = day.date.getFullYear();
    }).slice(1);

    var distinctYears = _.uniq(_.pluck(datedStats, 'year'));
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

    $scope.trendStats = groupByYear();
  }
]);
