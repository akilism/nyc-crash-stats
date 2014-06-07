'use strict';

var LIMIT = 1000;
var APPTOKEN = 'ZdHCSOwDOXtWweAUJZKJvoVoS';
var _ = require('lodash');

// build an array of keys to request this is a utility function to
// return totals of killed and injured for each group
// and a count of unique keys. groupKey is optional.
var getGroupedTotals = function (groupKey) {
  var yearTotals = [
    {
      'key': 'npi',
      'func': 'sum'
    },
    {
      'key': 'npk',
      'func': 'sum'
    },
    {
      'key': 'nei',
      'func': 'sum'
    },
    {
      'key': 'nek',
      'func': 'sum'
    },
    {
      'key': 'nci',
      'func': 'sum'
    },
    {
      'key': 'nck',
      'func': 'sum'
    },
    {
      'key': 'nmi',
      'func': 'sum'
    },
    {
      'key': 'nmk',
      'func': 'sum'
    },
    {
      'key': 'uk',
      'func': 'count'
    }
  ];

  if(groupKey) {
    yearTotals.unshift({
      'key': groupKey,
      'func': null
    });
  }

  return yearTotals;
};

// a mapping of socrata columns to shortened keys to reduce
// amount of data transferred.
var dataMap = {
 'b': 'borough',
 'cfv1': 'contributing_factor_vehicle_1',
 'cfv2': 'contributing_factor_vehicle_2',
 'cfv3': 'contributing_factor_vehicle_3',
 'd': 'date',
 'lat': 'latitude',
 'lon': 'longitude',
 'loc': 'location',
 // 'nr': 'needs_recoding',
 'nci': 'number_of_cyclist_injured',
 'nck': 'number_of_cyclist_killed',
 'nmi': 'number_of_motorist_injured',
 'nmk': 'number_of_motorist_killed',
 'nei': 'number_of_pedestrians_injured',
 'nek': 'number_of_pedestrians_killed',
 'npi': 'number_of_persons_injured',
 'npk': 'number_of_persons_killed',
 'offsn': 'off_street_name',
 'onsn': 'on_street_name',
 't': 'time',
 'uk': 'unique_key',
 // 'yr': 'year',
 'zp': 'zip_code',
 'ta': 'total_accidents'
};

// build the api call select string for an array of keys
// key format is
// {
//   'key': shortened_key,
//   'func': any socrata api column function (ie. count(), sum()) or null for none.
// }
//
// if you pass {'key': '*'} it will return the equivalent of doing select * but with
// shortened keys.
var buildSelect = function (keysToSelect) {
  var selectStrings, excludeKey = 'ta';

  if(keysToSelect[0].key === '*') {
    keysToSelect = _.map(_.keys(dataMap), function (key) {
      return {
        'key': key,
        'func': null
      };
    });
  }

  selectStrings = _.map(keysToSelect, function (key) {
      if (key.func) {
        return (key.key === excludeKey) ? null : key.func + '(' + dataMap[key.key] + ') as ' + key.key;
      }
      return (key.key === excludeKey) ? null : dataMap[key.key] + ' as ' + key.key;
    });
  // console.log(_.compact(selectStrings).join(','));
  return _.compact(selectStrings).join(',');
};

var all = [{ 'key': '*' }];

exports.url = [{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(getGroupedTotals()) + '&$where=date > \'2014-01-01\'&$$app_token=' + APPTOKEN,
  saveKey: 'yearly'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(getGroupedTotals('cfv1')) + '&$where=date > \'2014-01-01\'&$group= contributing_factor_vehicle_1&$order= uk desc&$$app_token=' + APPTOKEN,
  saveKey: 'factorsVehicle1'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(getGroupedTotals('cfv2')) + '&$where=date > \'2014-01-01\'&$group= contributing_factor_vehicle_2&$order= uk desc&$$app_token=' + APPTOKEN,
  saveKey: 'factorsVehicle2'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(all) + '&$where=date > \'2014-01-01\'&$limit=' + LIMIT + '&$order=date DESC&$$app_token=' + APPTOKEN,
  saveKey: 'lastAccidents'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(all) + '&$where=date > \'2014-01-01\' AND number_of_persons_killed > 0&$limit=' + LIMIT + '&$order=date DESC&$$app_token=' + APPTOKEN,
  saveKey: 'lastDeaths'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(all) + '&$where=date > \'2014-01-01\' AND number_of_persons_injured > 0&$limit=' + LIMIT + '&$order=date DESC&$$app_token=' + APPTOKEN,
  saveKey: 'lastInjuries'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(getGroupedTotals('zp')) + '&$group=zip_code&$limit=' + LIMIT + '&$order=uk DESC&$$app_token=' + APPTOKEN,
  saveKey: 'zipCodes'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(getGroupedTotals('b')) + '&$group=borough&$limit=' + LIMIT + '&$order=uk DESC&$$app_token=' + APPTOKEN,
  saveKey: 'boroughs'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(getGroupedTotals('d')) + '&$group=date&$limit=' + LIMIT + '&$order=uk DESC&$$app_token=' + APPTOKEN,
  saveKey: 'days'
}
];

exports.time = [
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(getGroupedTotals('t')) + '&$group=time&$limit=' + LIMIT + '&$order=uk DESC&$$app_token=' + APPTOKEN,
  saveKey: 'time1'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(getGroupedTotals('t')) + '&$group=time&$limit=' + LIMIT + '&$offset=1000&$order=uk DESC&$$app_token=' + APPTOKEN,
  saveKey: 'time2'
}
];

exports.dailyTotals = function (boundingBox) {
  return (boundingBox) ? {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(getGroupedTotals('d')) + '&$where=latitude >= ' + boundingBox.leftLat + ' AND latitude <= ' + boundingBox.rightLat + ' AND longitude >= ' + boundingBox.leftLon + ' AND longitude <= ' + boundingBox.rightLon + '&$group=date&$order=date'
  } :
  {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(getGroupedTotals('d')) + '&$group=date&$order=date'
  };
};

exports.locationQuery = function (latitude, longitude) {
  return {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(all) + '&$where=longitude=' + longitude + ' AND latitude=' + latitude + 'AND date > \'2014-01-01\'&$limit=' + LIMIT + '&$order=date DESC&$$app_token=' + APPTOKEN
  };
};


exports.boundingBoxQuery = function (boundingBox, offset, limit) {
  var resultLimit = limit || LIMIT;
  return {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(all) + '&$where=latitude >= ' + boundingBox.leftLat + ' AND latitude <= ' + boundingBox.rightLat + ' AND longitude >= ' + boundingBox.leftLon + ' AND longitude <= ' + boundingBox.rightLon + '&$limit=' + resultLimit + '&$offset=' + offset + '&$order=date ASC&$$app_token=' + APPTOKEN
  };
};

exports.boundingBoxQueryByYear = function (boundingBox, offset, limit, year) {
  var resultLimit = limit || LIMIT;
  var yearEnd = (year.end) ? 'AND date < \'' + year.end + '\'' : '';
  return {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(all) + '&$where=latitude >= ' + boundingBox.leftLat + ' AND latitude <= ' + boundingBox.rightLat + ' AND longitude >= ' + boundingBox.leftLon + ' AND longitude <= ' + boundingBox.rightLon + ' AND date > \'' + year.start + '\'' + yearEnd + '&$limit=' + resultLimit + '&$offset=' + offset + '&$order=date ASC&$$app_token=' + APPTOKEN
  };
};

exports.boundingBoxQueryCurrentYear = function (boundingBox, offset, limit) {
  var resultLimit = limit || LIMIT;
  return {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=' + buildSelect(all) + '&$where=latitude >= ' + boundingBox.leftLat + ' AND latitude <= ' + boundingBox.rightLat + ' AND longitude >= ' + boundingBox.leftLon + ' AND longitude <= ' + boundingBox.rightLon + ' AND date > \'2014-01-01\'&$limit=' + resultLimit + '&$offset=' + offset + '&$order=date ASC&$$app_token=' + APPTOKEN
  };
};

exports.boundingBoxCount = function (boundingBox) {
  return {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=count(unique_key) as total&$where=latitude >= ' + boundingBox.leftLat + ' AND latitude <= ' + boundingBox.rightLat + ' AND longitude >= ' + boundingBox.leftLon + ' AND longitude <= ' + boundingBox.rightLon + '&$$app_token=' + APPTOKEN
  } ;
};

exports.boundingBoxCountByYear = function (boundingBox, year) {
  var yearEnd = (year.end) ? 'AND date < \'' + year.end + '\'' : '';
  return {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=count(unique_key) as total&$where=latitude >= ' + boundingBox.leftLat + ' AND latitude <= ' + boundingBox.rightLat + ' AND longitude >= ' + boundingBox.leftLon + ' AND longitude <= ' + boundingBox.rightLon + ' AND date > \'' + year.start + '\'' + yearEnd + '&$$app_token=' + APPTOKEN
  };
};

exports.boundingBoxCountCurrentYear = function (boundingBox) {
  return {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=count(unique_key) as total&$where=latitude >= ' + boundingBox.leftLat + ' AND latitude <= ' + boundingBox.rightLat + ' AND longitude >= ' + boundingBox.leftLon + ' AND longitude <= ' + boundingBox.rightLon + ' AND date > \'2014-01-01\'&$$app_token=' + APPTOKEN
  } ;
};

exports.metadataUrl = 'https://data.cityofnewyork.us/views/h9gi-nx95.json';
