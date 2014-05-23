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

    $scope.setActiveAccident = function (accident, useApply) {
      console.log(accident);
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

    $scope.showAccidentDetails = function (accidentId) {
      // console.log(accidentId);
      var accident = getAccident(accidentId);

      if(accident) {
        accident.additionalAccidents = getAdditionalAccidents(accident.location);
      }

      $scope.$apply(function () {
        $scope.popup = accident;
      });
    };


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

    $scope.setNewClass = function () {
      if($scope.newAccidents || $scope.newKills || $scope.newInjuries) {
        return 'col-md-6';
      } else {
        return 'hide';
      }
    };

    var setLocalStorage = function (crashData) {
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

    $scope.activeAccident = crashStats.lastAccidents[0];
  }]);
