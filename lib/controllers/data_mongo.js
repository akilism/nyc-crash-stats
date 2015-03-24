var MongoClient = require('mongodb').MongoClient,
  dataFile = require('./data_file'),
  Q = require('q'),
  _ = require('lodash'),
  config = require('../config/config');
var dataMap = {
 'b': 'borough',
 'cfv1': 'contributing_factor_vehicle_1',
 'cfv2': 'contributing_factor_vehicle_2',
 'cfv3': 'contributing_factor_vehicle_3',
 'd': 'date',
 'lat': 'latitude',
 'lon': 'longitude',
 'loc': 'location',
 'nci': 'number_of_cyclist_injured',
 'nck': 'number_of_cyclist_killed',
 'nmi': 'number_of_motorist_injured',
 'nmk': 'number_of_motorist_killed',
 'nei': 'number_of_pedestrians_injured',
 'nek': 'number_of_pedestrians_killed',
 'npi': 'number_of_persons_injured',
 'npk': 'number_of_persons_killed',
 'offsn': 'cross_street_name',
 'onsn': 'on_street_name',
 't': 'time',
 'uk': 'unique_key',
 'zp': 'zip_code',
 'vt1': 'vehicle_type_code_1',
 'vt2': 'vehicle_type_code_2',
 'vt3': 'vehicle_type_code_3',
 'vt4': 'vehicle_type_code_4',
 'vt5': 'vehicle_type_code_5',
};

var mongoConnect = Q.denodeify(MongoClient.connect);
var connectionString = config.mongo;

//remaps the full keys to abbreviated keys.
var buildAbbrevCrash = function (item) {
  var crash = {};
  _.forOwn(dataMap, function (val, key) {
    crash[key] = item[val];
  });
  return crash;
};

var buildFullCrash = function (item) {
  var crash = {};
  _.forOwn(dataMap, function (val, key) {
    crash[val] = item[key];
  });
  return crash;
};

//Returns an array of crashes.
var fetchCrashes = function (collectionName, query, options) {
  var deferred = Q.defer();

  mongoConnect(connectionString).then( function (db) {
    var collection = db.collection(collectionName);
    var stream = collection.find(query, options).stream();
    var lastKey = 0;
    var crashes = [];

    stream.on('data', function (item) {
      lastKey = (item.unique_key > lastKey) ? item.unique_key : lastKey;
      var crash = {};
      crash = buildAbbrevCrash(item);
      crashes.push(crash);
    });

    stream.on('end', function () {
      db.close();
      console.log(query, options, crashes.length, lastKey);
      deferred.resolve({'lastKey': lastKey, 'crashes': crashes, 'total_accidents': crashes.length});
    });
  });

  return deferred.promise;
};

//Returns a stream of crashes.
var fetchCrashStream = function (collectionName, query, options) {
  var deferred = Q.defer();

  mongoConnect(connectionString).then( function (db) {
    var collection = db.collection(collectionName);
    var stream = collection.find(query, options).stream();

    stream.on('end', function () {
      db.close();
      console.log('crash stream end');
    });

    deferred.resolve(stream);

    // stream.on('data', function (item) {
    //   lastKey = (item.unique_key > lastKey) ? item.unique_key : lastKey;
    //   var crash = {};
    //   crash = buildCrash(item);
    //   crashes.push(crash);
    // });

  });

  return deferred.promise;
};

var transformResult = function (results) {
  var newResult = [];

  _.forEach(results, function (result) {
    var transformedResult = {};
    transformedResult.value = {};
    _.forOwn(result, function (val, key) {
      if(key === '_id') {
        transformedResult._id = val;
      } else {
        transformedResult.value[key] = val;
      }
    });
    newResult.push(transformedResult);
  });

  return newResult;
};

//Gets totals from precalculated collection in datastore.
var getDateRangeTotalsComplete = function(collectionName, start, end, byYear) {
  var deferred = Q.defer();

  mongoConnect(connectionString).then(function (db) {
    var collection = db.collection(collectionName),
      query = {
        type: 'city',
        id: 'city'
        // year: {$gte: start.getFullYear(), $lte: end.getFullYear()},
        // month: {$gte: start.getMonth(), $lte: end.getMonth()}
      };
      console.log(query);
      var stream = collection.find(query, {}).stream();
      var totals = [];

      stream.on('data', function (item) {
        // console.log(item);
        totals.push(item);
      });

      stream.on('end', function () {
        db.close();
        deferred.resolve(totals);
      });
  });

  return deferred.promise;
};

//Uses database aggregation.
var getDateRangeTotals = function(collectionName, start, end, byYear) {
  var deferred = Q.defer();

  mongoConnect(connectionString).then(function (db) {
    var collection = db.collection(collectionName),
        aggregationMatch = { $match : {date: {$gte: start, $lt: end}}},
        aggregationProject = { $project : {
            number_of_cyclist_injured : 1,
            number_of_cyclist_killed : 1,
            number_of_motorist_injured : 1,
            number_of_motorist_killed : 1,
            number_of_pedestrians_injured : 1,
            number_of_pedestrians_killed : 1,
            number_of_persons_injured : 1,
            number_of_persons_killed : 1,
            date : 1,
            year_crash: {$year: '$date'},
            month_crash: {$month: '$date'}
          }},
        grouping = (byYear) ? {year : '$year_crash'} : {year : '$year_crash', month : '$month_crash'},
        aggregationGroup = {$group : {_id: grouping,
          number_of_cyclist_injured : { '$sum' : '$number_of_cyclist_injured'},
          number_of_cyclist_killed : { '$sum' : '$number_of_cyclist_killed'},
          number_of_motorist_injured : { '$sum' : '$number_of_motorist_injured'},
          number_of_motorist_killed : { '$sum' : '$number_of_motorist_killed'},
          number_of_pedestrians_injured : { '$sum' : '$number_of_pedestrians_injured'},
          number_of_pedestrians_killed : { '$sum' : '$number_of_pedestrians_killed'},
          number_of_persons_injured : { '$sum' : '$number_of_persons_injured'},
          number_of_persons_killed : { '$sum' : '$number_of_persons_killed'},
          total_accidents : { '$sum' : 1}}};

    collection.aggregate([aggregationMatch, aggregationProject, aggregationGroup],
      function (err, result) {
        console.log('result1', result);
        if(result) {
          deferred.resolve(transformResult(result));
        } else {
          deferred.reject(err);
        }
    });
  }).catch(function (err) {
    console.log(err);
  });

  return deferred.promise;
};

//Uses mapreduce framework..
//dont think this works anymore.
var mapreduce_getDateRangeTotals = function (collectionName, start, end, byYear) {
  var deferred = Q.defer();

  var mapYear = function () {
    var key = this.date.getFullYear();
    var value = {
      'number_of_cyclist_injured' : this.number_of_cyclist_injured,
      'number_of_cyclist_killed' : this.number_of_cyclist_killed,
      'number_of_motorist_injured' : this.number_of_motorist_injured,
      'number_of_motorist_killed' : this.number_of_motorist_killed,
      'number_of_pedestrians_injured' : this.number_of_pedestrians_injured,
      'number_of_pedestrians_killed' : this.number_of_pedestrians_killed,
      'number_of_persons_injured' : this.number_of_persons_injured,
      'number_of_persons_killed' : this.number_of_persons_killed
    };
    emit(key, value);
  };

  var mapMonth = function () {
    var key = this.date.getFullYear() + ',' + this.date.getMonth();
    var value = {
      'number_of_cyclist_injured' : this.number_of_cyclist_injured,
      'number_of_cyclist_killed' : this.number_of_cyclist_killed,
      'number_of_motorist_injured' : this.number_of_motorist_injured,
      'number_of_motorist_killed' : this.number_of_motorist_killed,
      'number_of_pedestrians_injured' : this.number_of_pedestrians_injured,
      'number_of_pedestrians_killed' : this.number_of_pedestrians_killed,
      'number_of_persons_injured' : this.number_of_persons_injured,
      'number_of_persons_killed' : this.number_of_persons_killed
    };
    emit(key, value);
  };

  var reduce = function (key, values) {
    var reducedSet = {};
    var totals = {
      'number_of_cyclist_injured' : 0,
      'number_of_cyclist_killed' : 0,
      'number_of_motorist_injured' : 0,
      'number_of_motorist_killed' : 0,
      'number_of_pedestrians_injured' : 0,
      'number_of_pedestrians_killed' : 0,
      'number_of_persons_injured' : 0,
      'number_of_persons_killed' : 0
    };

    values.forEach(function (val) {
      totals.number_of_cyclist_injured += val.number_of_cyclist_injured;
      totals.number_of_cyclist_killed += val.number_of_cyclist_killed;
      totals.number_of_motorist_injured += val.number_of_motorist_injured;
      totals.number_of_motorist_killed += val.number_of_motorist_killed;
      totals.number_of_pedestrians_injured += val.number_of_pedestrians_injured;
      totals.number_of_pedestrians_killed += val.number_of_pedestrians_killed;
      totals.number_of_persons_injured += val.number_of_persons_injured;
      totals.number_of_persons_killed += val.number_of_persons_killed;
    });
    totals.total_accidents = values.length;
    return totals;
  };

  mongoConnect(connectionString).then(function (db) {
    var collection = db.collection(collectionName);
    var map = (byYear) ? mapYear : mapMonth;
    var mrOpts = {
      'query': {'date': {$gte: start, $lt: end}},
      'out': {'inline': 1}
    };

    collection.mapReduce(map, reduce, mrOpts, function (err, result) {
      if(result) {
        // console.log(result);
        deferred.resolve(result);
      } else {
        deferred.reject(err);
      }
    });
  });

  return deferred.promise;
};

var getYearRange = function (year) {
  var range = {
    'start': null,
    'end': null
  };

  switch(year) {
    case '2015-01-01':
      range.start = new Date(2015, 0, 1);
      range.end = new Date();
      break;
    case '2014-01-01':
      range.start = new Date(2014, 0, 1);
      range.end = new Date(2015, 0, 1);
      break;
    case '2013-01-01':
      range.start = new Date(2013, 0, 1);
      range.end = new Date(2014, 0, 1);
      break;
    case '2012-01-01':
      range.start = new Date(2012, 0, 1);
      range.end = new Date(2013, 0, 1);
      break;
    case '2015-01-01':
    default:
      range.start = new Date(2015, 0, 1);
      range.end = new Date();
      break;
  }

  return range;
};

var getShapeQueries = function (shapes, yearRange, singleYear) {
  var queries = [];
  _.forEach(shapes, function (shape) {
    var query = {};
    query = (singleYear) ? {'loc': {$geoIntersects: {$geometry: shape.geometry}}, 'date': {$gte: yearRange.start, $lt: yearRange.end}} : {'loc': {$geoIntersects: {$geometry: shape.geometry}}};
    queries.push(fetchCrashes('crashes', query, {}));
  });
  return queries;
};

var getTypeQuery = function (type, identifier, yearRange, singleYear) {
  var queries = [], query = {};
  query = (singleYear) ? {'date': {$gte: yearRange.start, $lt: yearRange.end}} : {};
  query[type] = (type === 'neighborhood') ? identifier : Number(identifier);
  queries.push(fetchCrashes('crashes', query, {}));
  return queries;
};

var fetchAccidents = function (type, identifier, year) {
  var singleYear = (year.toLowerCase() === 'all') ? false : true,
  yearRange = (singleYear) ? getYearRange(year) : {},
  maxBox,
  finalData = {};


  // console.log(year, singleYear, yearRange);
  return dataFile.getShape(type, identifier).then(function (validShapes) {
    finalData.shapes = validShapes;
    return validShapes;
  })
  .then(function (shapes) {
    // Filtering on shape files.
    var queries = getShapeQueries(shapes, yearRange, singleYear);
    // Filtering on preset shape data.
    // var queries = getTypeQuery(type, identifier, yearRange, singleYear);
    return Q.allSettled(queries).then(function (results) {
      var accidents = [];
      _.forEach(results, function (result) {
        accidents = accidents.concat(result.value.crashes);
      });

      return accidents;
    });
  }).then(function (accidents) {
    finalData.accidents = accidents;
    return finalData;
  });
};

var fetchShapeTotal = function (type, identifier, year) {
  var singleYear = (year.toLowerCase() === 'all') ? false : true,
    yearRange = (singleYear) ? getYearRange(year) : {};

  var deferred = Q.defer();

  mongoConnect(connectionString).then(function (db) {
    var collection = db.collection('totals'),
      query = {
        type: type.toLowerCase(),
        id: identifier.toLowerCase()
      };
      console.log(query);
      var stream = collection.find(query, {}).stream();
      var totals = [];

      stream.on('data', function (item) {
        // console.log(item);
        totals.push(item);
      });

      stream.on('end', function () {
        db.close();
        deferred.resolve(totals);
      });
  });

  return deferred.promise;
};

var updateCrash = function (id, type, identifier, collection) {
  collection.update({'_id': id},
    {$set: {type: identifier}},
    {w: 1},
    function (err, result) {
      // console.log('updated: ', id, result);
    });
};

var geoTag = function (feature) {
  var identifier = feature.identifier;
  var type = feature.type;
  var query = {'loc': {$geoIntersects: {$geometry: feature.geometry}}};
  var options = {};
  var deferred = Q.defer();

  mongoConnect(connectionString).then( function (db) {
    var collection = db.collection("crashes");
    var stream = collection.find(query, options).stream();
    var lastKey = 0;
    var crashes = [];

    stream.on('data', function (item) {
      var id = item._id;
      updateCrash(id, type, identifier, collection);
    });

    stream.on('end', function () {
      db.close();
      deferred.resolve(true);
    });
  });
  return deferred.promise;
};

var transformCrash = function (crash) {

  if (crash.hasOwnProperty('location')) {
    crash.location.longitude = Number(crash.location.longitude);
    crash.location.latitude = Number(crash.location.latitude);
    crash.loc = {
      type: 'Point',
      coordinates: [crash.location.longitude, crash.location.latitude]
    };
  }

  if(_.isString(crash.date)) {
    crash.date = new Date(crash.date);
  }

  crash.number_of_persons_killed = Number(crash.number_of_persons_killed);
  crash.number_of_cyclist_injured = Number(crash.number_of_cyclist_injured);
  crash.number_of_motorist_injured = Number(crash.number_of_motorist_injured);
  crash.unique_key = Number(crash.unique_key);
  if (crash.unique_key === null || isNaN(crash.unique_key)) { console.log(crash); crash.unique_key = false; }
  crash.number_of_pedestrians_killed = Number(crash.number_of_pedestrians_killed);
  crash.number_of_motorist_killed = Number(crash.number_of_motorist_killed);
  crash.number_of_persons_injured = Number(crash.number_of_persons_injured);
  crash.number_of_pedestrians_injured = Number(crash.number_of_pedestrians_injured);
  crash.number_of_cyclist_killed = Number(crash.number_of_cyclist_killed);

  return crash;
};

var addCrashes = function (crashes, collectionName) {
  mongoConnect(connectionString).then(function (db) {
    var collection = db.collection(collectionName);
    console.log('crashes.length', crashes.length);
    collection.insert(_.filter(_.map(crashes, transformCrash), 'unique_key'),
      {continueOnError: true, safe: true, fullResult: false},
      function (err, docs) {
        if(err) { console.error(err); }
        // if(docs) { console.log('docs.length', docs.length); }
    });
  });
};

var fetchIntersection = function (collectionName, query, options) {
  var deferred = Q.defer();

  mongoConnect(connectionString).then( function (db) {
    var collection = db.collection(collectionName);
    var stream = collection.find(query, options).stream();
    var intersection;

    stream.on('data', function (item) {
      // console.log(item);
      intersection = item;
    });

    stream.on('end', function () {
      db.close();
      // console.log(query, options, intersection || 'no match');
      deferred.resolve(intersection);
    });
  });

  return deferred.promise;
};

var buildBulkReplaces = function(items) {
  var replaces = _.map(Object.keys(items), function(key) {
     return items[key];
  });
  return replaces;
};

var putIntersections = function (intersections, collectionName) {
  mongoConnect(connectionString).then(function (db) {
    var collection = db.collection(collectionName);
    console.log('saving intersections.\nintersections.length:', Object.keys(intersections).length);
    collection.insert(buildBulkReplaces(intersections),
     {continueOnError: true, safe: true, fullResult: false},
     function (err, docs) {
      if(err) { console.error(err); }
      if(docs) { console.log('saved docs.length', docs.length); }
      db.close();
    });
  });
};

var saveTotal = function(data) {
  var deferred = Q.defer();
  console.log('saving totals:', data.id, data.type);
  mongoConnect(connectionString).then(function(db) {
    var totalsColl = db.collection('totals');
    totalsColl.update({'type': data.type, 'id': data.id},
      {$set: data},
      {w: 1, 'upsert': true, 'fullResult': false},
      function (err, result) {
        if(err) { console.log('error:', err); }
        // else { console.log('result:', result); }
        db.close();
        deferred.resolve(true);
    });
  });

  return deferred.promise;
};

module.exports = {
  fetchCrashes:fetchCrashes,
  getDateRangeTotals:getDateRangeTotalsComplete,
  fetchAccidents:fetchAccidents,
  fetchShapeTotal:fetchShapeTotal,
  addCrashes:addCrashes,
  putIntersections:putIntersections,
  fetchIntersection:fetchIntersection,
  fetchCrashStream:fetchCrashStream,
  buildFullCrash:buildFullCrash,
  saveTotal:saveTotal
};
