'use strict';

// var directives = directives || {};

directives.directive('buttonDropdown', ['$location', 'GeoData', function ($location, GeoData) {

    return {
      templateUrl: 'partials/buttondropdown.html',
      restrict: 'E',
      // scope: {
      //   //'GeoData': GeoData
      // },
      controller: directives.buttonDropdown,
      controllerAs: 'buttonDropdown',
      link: function postLink(scope, element, attrs) {
        scope.hideDropDown = function () {
          element.find('.dropdown-menu').removeClass('show');
        };

        scope.loadArea = function (area, $event) {
          $event.preventDefault();
          $location.path('/' + area.type + '/' + area.identifier);
          scope.hideDropDown();
        };

        //parenttype is optional.
        scope.openDropDown = function (type, level, isLeaf, $event, parentType) {
          $event.preventDefault();
          var $$target = $($event.target);
          var $$dropdown;

          $('.dropdown-menu a').removeClass('active');
          if(element.find('.dropdown-menu.' + type + '.' + level).hasClass('show')) {
            element.find('.dropdown-menu.' + level).removeClass('show flip');
          } else {
            element.find('.dropdown-menu.' + level).removeClass('show flip');
            if (parentType) {
              $$target.addClass('active');
              $$dropdown = element.find('.dropdown-menu.' + type + '.' + level + '.' + parentType);
              $$dropdown.toggleClass('show');
              if($$dropdown.width() + $$dropdown.offset().left > $(window).width()) {
                $$dropdown.toggleClass('flip');
              }
            } else {
              $$dropdown = element.find('.dropdown-menu.' + type + '.' + level);
              $$dropdown.toggleClass('show');
              if($$dropdown.width() + $$dropdown.offset().left > $(window).width()) {
                $$dropdown.toggleClass('flip');
              }
            }
          }
        };
      }
    };
  }]);

directives.buttonDropdown = function (GeoData, $scope) {
  // $scope.$watch('menuData', function (oldVal, newVal) {
  //   $scope.data = newVal;
  // });

  var getAllShapes = function () {
    GeoData('/all').then(function (data) {
      // console.log(data);

      _.forEach(data, function (shape) {
        shape.name = getDisplayValue(shape.type, shape.identifier, false);
      });

      // $scope.shapes = data;

      $scope.data = buildMenu(data);
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



  getAllShapes();

};
