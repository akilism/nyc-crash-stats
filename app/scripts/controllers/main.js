'use strict';

angular.module('nycCrashStatsApp')
  .controller('MainCtrl', ['$scope', 'crashStats', function ($scope, crashStats) {
    crashStats.lastAccidents.title = 'Last ' + crashStats.lastAccidents.length + ' Accidents';
    crashStats.lastAccidents.id = 'accident';
    crashStats.lastInjuries.title = 'Last ' + crashStats.lastInjuries.length + ' Injuries';
    crashStats.lastInjuries.id = 'injury';
    crashStats.lastDeaths.title = 'Last ' + crashStats.lastDeaths.length + ' Deaths';
    crashStats.lastDeaths.id = 'death';

    $scope.crashStats = crashStats;

    $scope.yearly = crashStats.yearly[0];

    $scope.setTotalsClass = function () {
      if($scope.newAccidents || $scope.newKills || $scope.newInjuries) {
        return 'col-md-6';
      } else {
        return 'col-md-12';
      }
    };

    $scope.setNewClass = function () {
      if($scope.newAccidents || $scope.newKills || $scope.newInjuries) {
        return 'col-md-6';
      } else {
        return 'hide';
      }
    };

    var setLocalStorage = function (crashData) {
      var newData = {};
      newData.totalKilled = crashData.total_killed;
      newData.totalInjured = crashData.total_injured;
      newData.totalAccidents = crashData.total_accidents;
      localStorage['nycCrashStatsApp'] = JSON.stringify(newData);
    };

    var loadFromLocalStorage = function (crashData, storedData) {
      storedData = JSON.parse(storedData);
      var newData = {};

      //newAccidents newKills newInjuries dummy data.
      // crashData.total_killed = 100;
      // crashData.total_injured = 100000;
      // crashData.total_accidents = 1000000;

      if(crashData.total_killed > storedData.totalKilled) {
        $scope.newKills = crashData.total_killed - storedData.totalKilled;
        newData.totalKilled = crashData.total_killed;
      } else {
        newData.totalKilled = storedData.totalKilled;
      }

      if(crashData.total_injured > storedData.totalInjured) {
        $scope.newInjuries = crashData.total_injured - storedData.totalInjured;
        newData.totalInjured = crashData.total_injured;
      } else {
        newData.totalInjured = storedData.totalInjured;
      }

      if(crashData.total_accidents > storedData.totalAccidents) {
        $scope.newAccidents = crashData.total_accidents - storedData.totalAccidents;
        newData.totalAccidents = crashData.total_accidents;
      } else {
        newData.totalAccidents = storedData.totalAccidents;
      }

      localStorage['nycCrashStatsApp'] = JSON.stringify(newData);
    };


    // clear local storage: localStorage.removeItem('nycCrashStatsApp');
    var storedData = localStorage['nycCrashStatsApp'];

    if(storedData) {
      loadFromLocalStorage(crashStats.yearly[0], storedData);
    } else {
      setLocalStorage(crashStats.yearly[0]);
    }
    // console.log($scope.yearly);
    // console.log($scope.crashStats);
  }]);
