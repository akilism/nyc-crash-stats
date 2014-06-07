//process all records...
//update raw_location to an object { lat: float, lon: float }

var mc = require('mongodb').MongoClient,
    // dataFile = require('../controllers/data_file'),
    // dataMongo = require('../controllers/data_mongo'),
    Q = require('q'),
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash');

// var updateCrash = function (id, type, identifier, crashes) {
var updateCrash = function (loc, id, crashes) {
  var deffered = Q.defer();
  crashes.update({'_id': id},
                 {$set: {'loc': { type: 'Point', coordinates: loc }}},
                 // {$set: {'location': location}},
                 // {$set: {'date': date}},
                 // {$set: {type: identifier}},
                 {w: 1},
                 function (err, result) {
                  console.log('updated: ', id, result);
                  deffered.resolve(true);
                 });
  return deffered.promise;
};

var setLocations = function (db) {
  var crashes = db.collection('crashes');
  var location;
  // var stream = crashes.find({'location': {$exists: false}}).stream();
  var stream = crashes.find({}).stream();

  stream.on('data', function (item) {
    // // console.log(item.date);
    var objId;

    if (item.hasOwnProperty('location') && item.location !== '' && item.location) {
      // var loc = '' + item.location.longitude + ', '+ item.location.latitude;
      var loc = [item.location.longitude, item.location.latitude];
      objId = item._id;
      updateCrash(loc, objId, crashes);
    }

    // if(_.isString(item.date)) {
    //   var dateParts = item.date.split('/');
    //   var year = dateParts[2];
    //   var month = parseInt(dateParts[0], 10) - 1;
    //   var day = dateParts[1];

    //   var timeParts = item.time.split(':');
    //   var hour = timeParts[0];
    //   var min = timeParts[1];

    //   var date = new Date(year, month, day, hour, min);
    //   // date.setMonth(date.getMonth() - 1, date.getDate);
    //   objId = item._id;

    //   updateCrash(date, objId, crashes);
    // }
    // console.log(item.date, item.time, date);
    // console.log(item);

    // lat == index 0
    // lon == index 1

    // location = null;

    // if (item.latitude && item.longitude && item.latitude !== '' && item.longitude !== '') {
    //   location = {
    //     'latitude': item.latitude,
    //     'longitude': item.longitude
    //   };
    // } else if (item.raw_location) {
    //   console.log('raw location: ', item.raw_location);
    //   var parts = item.raw_location.replace('[', '').replace(']', '').split(',');
    //   location = {
    //     'latitude': parts[0],
    //     'longitude': parts[1]
    //   };
    // }

    // if (location) {
    //   objId = item._id;
    //   updateCrash(location, objId, crashes);
    //   location = null;
    // }
  });

  stream.on('end', function () { console.log('done'); process.exit(); });
};

var runQuery = function (db, query, options) {
  var crashes = db.collection('crashes');
  var stream = crashes.find(query, options).stream();
  var crashCount = 0;
  stream.on('data', function (item) {
    crashCount++;
    // console.log('Crash', item.unique_key, item.date, item.borough);
  });

  stream.on('end', function () { console.log('Total count matching crashes:', crashCount); process.exit(); });
};

// Build a feature object based on some properties. Needed to filter shapes.
var buildFeature = function (featureProperties) {
  var feature = {};

  if(featureProperties.hasOwnProperty('postalCode')) {
    return {
      'type': 'zipcode',
      'identifier': featureProperties.postalCode,
      'borough': featureProperties.borough
    };
  }

  if (featureProperties.hasOwnProperty('communityDistrict')) {
    return {
      'type': 'community',
      'identifier': featureProperties.communityDistrict
    };
  }

  if (featureProperties.hasOwnProperty('cityCouncilDistrict')) {
    return {
      'type': 'citycouncil',
      'identifier': featureProperties.cityCouncilDistrict
    };
  }

  if (featureProperties.hasOwnProperty('neighborhood')) {
    return {
      'type': 'neighborhood',
      'identifier': featureProperties.neighborhood,
      'borough': featureProperties.borough
    };
  }

  if (featureProperties.hasOwnProperty('policePrecinct')) {
    return {
      'type': 'precinct',
      'identifier': featureProperties.policePrecinct,
      'borough': featureProperties.borough
    };
  }
};

//load geojson shape files.
var getGeoFile = function (files) {
  var data = [],
    promises = _.map(files, function (file) {
      return dataFile.file.getShapeFile(file, null);
    });

  return Q.allSettled(promises).then(function (results) {
    _.forEach(results, function(result, i) {
      var fileData = JSON.parse(result.value);
      _.forEach(fileData.features, function (fileFeature) {
        var feature = buildFeature(fileFeature.properties);
        feature.geometry = fileFeature.geometry;
        var found = _.find(data, function (stored) {
          if (stored.identifier === feature.identifier && stored.type === feature.type) {
            return true;
          }
          return false;
        });
        if(!found) { data.push(feature); }
      });
    });
    return data;
  });
};

var setCrashFeature = function (features, db) {
  var feature = features.pop();
  var identifier = (feature.type === 'precinct') ? parseInt(feature.identifier, 10) : feature.identifier.toLowerCase();
  var type = feature.type;
  var query = {'loc': {$geoIntersects: {$geometry: feature.geometry}}};
  var options = {}; // {'limit': 1000};
  var collection = db.collection('crashes');
  // console.log('Searching', query);
  console.log('setting: ', type, identifier);
  var featureType = {};
  featureType[type] = identifier;
  collection.update(query,
                    {$set: featureType},
                    {w: 1, multi:true},
                    function(err, countUpdated) {
                      console.log('updated count:', countUpdated);
                      if (features.length > 0) {
                        console.log(features.length, 'features left to set.');
                        setCrashFeature(features, db);
                      } else {
                        console.log('finished.');
                        // db.close();
                        // process.exit();
                      }
                    });

  // var crashes = collection.find(query, options).toArray(function (err, results) {
  //   if (err) {
  //     console.error(err);
  //     db.close();
  //     process.exit();
  //   } else {
  //     console.log(feature.identifier, 'count of matching crashes:', results.length);
  //     if (features.length > 0) {
  //       setCrashFeature(features, db);
  //     } else {
  //       console.log('finished.');
  //       db.close();
  //       process.exit();
  //     }
  //   }
  // });

  // var stream = collection.find(query, options).stream();

  // stream.on('data', function (item) {
  //   var id = item._id;
  //   console.log(id);
  //   updateCrash(id, type, identifier, collection);
  // });

  // stream.on('end', function () {
  //     if(features.length > 0) {
  //       console.log(features.length, ' features left');
  //       setCrashFeature(features, db);

  //     } else {
  //       console.log('done');
  //       db.close();
  //     }
  // });
};

var geoIntersectFiles = function (db) {
  var files = ['precinct', 'neighborhood'];
  //files = ['citycouncil', 'community', 'neighborhood', 'precinct', 'zipcode'];
  var promises = [];
  getGeoFile(files).then(function (features) {
    setCrashFeature(features, db);
  });
};

mc.connect('mongodb://localhost:27017/crashstats', function(err, db) {
    if(!err) {
      console.log('We are connected');
      setLocations(db);
      // geoIntersectFiles(db);
      var start = new Date(2014, 2, 1);
      var end = new Date(2014, 5, 1);
      var query = {'date': {$gte: start, $lt: end}};
      var options = {}; //{'sort': ['unique_key', 'desc']};
      // runQuery(db, query, options);
    }
});

