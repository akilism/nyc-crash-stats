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

    // console.log(crashStats);

    $scope.yearly = crashStats.yearly[0];

    $scope.setTotalsClass = function () {
      if($scope.newAccidents || $scope.newKills || $scope.newInjuries) {
        return 'col-md-6';
      } else {
        return 'col-md-12';
      }
    };

    $scope.setActiveAccident = function (accident, useApply) {
      if(useApply){
        $scope.$apply(function () {
          $scope.activeAccident = accident;
        });
      } else {
        $scope.activeAccident = accident;
      }

      // console.log(event);
      showDetailCrashPopup(event);

    };

    var closeDetailPopup = function () {
      $('#accidentPopup').css('display', 'none');
      $('#accidentPopup .btn-popup-close').off('click', closeDetailPopup);
    };

    var showDetailCrashPopup = function (event) {
      var $$popup = $('#accidentPopup');
      // console.log($$popup[0].clientWidth);

      // var left = event.pageX + 10;
      var top = 10;

      // if ($$popup[0].clientWidth + event.pageX > $(window).width()) {
      //   left = $$popup[0].clientWidth;
      // }

      // if ($$popup[0].clientHeight + event.pageY > $(window).height()) {
      //   top = $$popup[0].clientHeight;
      // }

      $$popup.css({
        'display': 'block',
        'margin-top': top + 'px'
      });

      $('#accidentPopup .btn-popup-close').on('click', closeDetailPopup);
    };

    $scope.setNewClass = function () {
      if($scope.newAccidents || $scope.newKills || $scope.newInjuries) {
        return 'col-md-6';
      } else {
        return 'hide';
      }
    };

    var setLocalStorage = function (crashData) {
      // var newData = {};
      // newData.totalKilled = crashData.total_killed;
      // newData.totalInjured = crashData.total_injured;
      // newData.totalAccidents = crashData.total_accidents;
      localStorage['nycCrashStatsApp'] = JSON.stringify(crashData);
    };

    var loadFromLocalStorage = function (crashData, storedData) {
      storedData = JSON.parse(storedData);
      var newData = {};

      //newAccidents newKills newInjuries dummy data.
      // crashData.total_killed = 100;
      // crashData.total_injured = 100000;
      // crashData.total_accidents = 1000000;

      if(crashData.total_accidents > storedData.total_accidents) {
        $scope.newAccidents = crashData.total_accidents - storedData.total_accidents;
      }

      if(crashData.total_killed > storedData.total_killed) {
        $scope.newKills = crashData.total_killed - storedData.total_killed;
      }

      if(crashData.total_injured > storedData.total_injured) {
        $scope.newInjuries = crashData.total_injured - storedData.total_injured;
      }

      if(crashData.total_injured > storedData.total_injured) {
        $scope.newInjuries = crashData.total_injured - storedData.total_injured;
      }

      if(crashData.pedestrians_killed > storedData.pedestrians_killed) {
        $scope.newPedestriansKilled = crashData.pedestrians_killed - storedData.pedestrians_killed;
      } else {
        $scope.newPedestriansKilled = 0;
      }

      if(crashData.cyclist_killed > storedData.cyclist_killed) {
        $scope.newCyclistKilled = crashData.cyclist_killed - storedData.cyclist_killed;
      } else {
        $scope.newCyclistKilled = 0;
      }

      if(crashData.motorist_killed > storedData.motorist_killed) {
        $scope.newMotoristKilled = crashData.motorist_killed - storedData.motorist_killed;
      } else {
        $scope.newMotoristKilled = 0;
      }

      if(crashData.pedestrians_injured > storedData.pedestrians_injured) {
        $scope.newPedestriansInjured = crashData.pedestrians_injured - storedData.pedestrians_injured;
      } else {
        $scope.newPedestriansInjured = 0;
      }

      if(crashData.cyclist_injured > storedData.cyclist_injured) {
        $scope.newCyclistInjured = crashData.cyclist_injured - storedData.cyclist_injured;
      } else {
        $scope.newCyclistInjured = 0;
      }

      if(crashData.motorist_injured > storedData.motorist_injured) {
        $scope.newMotoristInjured = crashData.motorist_injured - storedData.motorist_injured;
      } else {
        $scope.newMotoristInjured = 0;
      }

      localStorage['nycCrashStatsApp'] = JSON.stringify(crashData);
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
    $scope.activeAccident = crashStats.lastAccidents[0];
  }]);
