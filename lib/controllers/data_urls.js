'use strict';

var LIMIT = 1000;
var APPTOKEN = 'ZdHCSOwDOXtWweAUJZKJvoVoS';

exports.url = [{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=sum(number_of_persons_injured) as total_injured,sum(number_of_persons_killed) as total_killed,sum(number_of_pedestrians_injured) as pedestrians_injured,sum(number_of_pedestrians_killed) as pedestrians_killed,sum(number_of_cyclist_injured) as cyclist_injured,sum(number_of_cyclist_killed) as cyclist_killed,sum(number_of_motorist_injured) as motorist_injured,sum(number_of_motorist_killed) as motorist_killed, count(unique_key) as total_accidents&$where=date > \'2014-01-01\'&$$app_token=' + APPTOKEN,
  saveKey: 'yearly'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=contributing_factor_vehicle_1 as factor,sum(number_of_persons_injured) as total_injured,sum(number_of_persons_killed) as total_killed,sum(number_of_pedestrians_injured) as pedestrians_injured,sum(number_of_pedestrians_killed) as pedestrians_killed,sum(number_of_cyclist_injured) as cyclist_injured,sum(number_of_cyclist_killed) as cyclist_killed,sum(number_of_motorist_injured) as motorist_injured,sum(number_of_motorist_killed) as motorist_killed,count(unique_key) as total_accidents&$where=date > \'2014-01-01\'&$group= contributing_factor_vehicle_1&$order= total_accidents desc&$$app_token=' + APPTOKEN,
  saveKey: 'factors_vehicle1'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=contributing_factor_vehicle_2 as factor,sum(number_of_persons_injured) as total_injured,sum(number_of_persons_killed) as total_killed,sum(number_of_pedestrians_injured) as pedestrians_injured,sum(number_of_pedestrians_killed) as pedestrians_killed,sum(number_of_cyclist_injured) as cyclist_injured,sum(number_of_cyclist_killed) as cyclist_killed,sum(number_of_motorist_injured) as motorist_injured,sum(number_of_motorist_killed) as motorist_killed,count(unique_key) as total_accidents&$where=date > \'2014-01-01\'&$group= contributing_factor_vehicle_2&$order= total_accidents desc&$$app_token=' + APPTOKEN,
  saveKey: 'factors_vehicle2'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=*&$where=date > \'2014-01-01\'&$limit=' + LIMIT + '&$order=date DESC&$$app_token=' + APPTOKEN,
  saveKey: 'lastAccidents'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=*&$where=date > \'2014-01-01\' AND number_of_persons_killed > 0&$limit=' + LIMIT + '&$order=date DESC&$$app_token=' + APPTOKEN,
  saveKey: 'lastDeaths'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=*&$where=date > \'2014-01-01\' AND number_of_persons_injured > 0&$limit=' + LIMIT + '&$order=date DESC&$$app_token=' + APPTOKEN,
  saveKey: 'lastInjuries'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=zip_code,sum(number_of_persons_killed) as total&$group=zip_code&$limit=' + LIMIT + '&$order=total DESC&$$app_token=' + APPTOKEN,
  saveKey: 'zipCodes'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=borough,sum(number_of_persons_killed) as total&$group=borough&$limit=' + LIMIT + '&$order=total DESC&$$app_token=' + APPTOKEN,
  saveKey: 'boroughs'
},
{
  url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=date,sum(number_of_persons_killed) as total&$group=date&$limit=' + LIMIT + '&$order=total DESC&$$app_token=' + APPTOKEN,
  saveKey: 'deadlyDays'
}];

exports.dailyTotals = function (boundingBox) {
  return (boundingBox) ? {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=date,sum(number_of_persons_injured) as total_injured,sum(number_of_persons_killed) as total_killed,sum(number_of_pedestrians_injured) as pedestrians_injured,sum(number_of_pedestrians_killed) as pedestrians_killed,sum(number_of_cyclist_injured) as cyclist_injured,sum(number_of_cyclist_killed) as cyclist_killed,sum(number_of_motorist_injured) as motorist_injured,sum(number_of_motorist_killed) as motorist_killed,count(unique_key) as total_accidents&$where=latitude >= ' + boundingBox.leftLat + ' AND latitude <= ' + boundingBox.rightLat + ' AND longitude >= ' + boundingBox.leftLon + ' AND longitude <= ' + boundingBox.rightLon + '&$group=date&$order=date'
  } :
  {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=date,sum(number_of_persons_injured) as total_injured,sum(number_of_persons_killed) as total_killed,sum(number_of_pedestrians_injured) as pedestrians_injured,sum(number_of_pedestrians_killed) as pedestrians_killed,sum(number_of_cyclist_injured) as cyclist_injured,sum(number_of_cyclist_killed) as cyclist_killed,sum(number_of_motorist_injured) as motorist_injured,sum(number_of_motorist_killed) as motorist_killed,count(unique_key) as total_accidents&$group=date&$order=date'
  };
};

exports.locationQuery = function (latitude, longitude) {
  return {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=*&$where=longitude=' + longitude + ' AND latitude=' + latitude + 'AND date > \'2014-01-01\'&$limit=' + LIMIT + '&$order=date DESC&$$app_token=' + APPTOKEN
  };
};


exports.boundingBoxQuery = function (boundingBox, offset, limit) {
  var resultLimit = limit || LIMIT;
  return {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=*&$where=latitude >= ' + boundingBox.leftLat + ' AND latitude <= ' + boundingBox.rightLat + ' AND longitude >= ' + boundingBox.leftLon + ' AND longitude <= ' + boundingBox.rightLon + ' AND date > \'2014-01-01\'&$limit=' + resultLimit + '&$offset=' + offset + '&$order=date DESC&$$app_token=' + APPTOKEN
  };
};

exports.boundingBoxCount = function (boundingBox) {
  return {
    url: 'http://data.cityofnewyork.us/resource/h9gi-nx95.json?$select=count(unique_key) as total&$where=latitude >= ' + boundingBox.leftLat + ' AND latitude <= ' + boundingBox.rightLat + ' AND longitude >= ' + boundingBox.leftLon + ' AND longitude <= ' + boundingBox.rightLon + ' AND date > \'2014-01-01\'&$$app_token=' + APPTOKEN
  } ;
};

exports.metadataUrl = 'https://data.cityofnewyork.us/views/h9gi-nx95.json';
