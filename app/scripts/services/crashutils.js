'use strict';

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

var getTitle = function (path) {
  if(path.toLowerCase().indexOf('trend') !== -1) {
    return 'city wide.';
  }

  var parts = path.split('/');
  var type = parts[1];
  var value = parts[2];

  return getDisplayValue(type, value, true);
};

services.factory('CrashUtils', ['$http', '$q', function ($http, $q) {
  return {
    getActiveType: getActiveType,
    factorMap: factorMap,
    getAccidentFactors: getAccidentFactors,
    calculateFactorTotals: calculateFactorTotals
  };
}]);
