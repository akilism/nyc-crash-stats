
var fs = require('fs'),
  through = require('through'),
  _ = require('lodash'),
  Q = require('q'),
  dataFile = require('./data_file'),
  dataMongo = require('./data_mongo'),
  Totaler = require('../helpers/totaler'),
  files = ['borough', 'citycouncil', 'community',
           'neighborhood', 'precinct', 'zipcode'];

var loadFile = function(fileType) {
  return dataFile.getShapeFile(fileType).then(function(fileData) {
    var geoJson = JSON.parse(fileData);
    return geoJson.features;
  });
};

var getCrashes = function(shape) {
  var query = {loc: {$geoIntersects: {$geometry: shape.geometry}}};
  return dataMongo.fetchCrashes('crashes', query, {});
};

var calculateTotals = function(crashes) {
  var ttl = new Totaler();
  _.forEach(crashes, function(crash) {
    ttl.calcTotals(dataMongo.buildFullCrash(crash));
  });
  return ttl.totals;
};

var addTotals = function(ttlA, ttlB) {
  var ttl = _.cloneDeep(ttlA);

  _.forEach(ttlB, function(v, k) {
    if(k === 'year' || k === 'month') { return; }

    if(_.isNumber(ttlB[k])) {
      if(!ttl[k]) {
        ttl[k] = ttlB[k];
      } else {
        ttl[k] += ttlB[k];
      }
    } else {
      if(ttl[k]) {
        ttl[k] = addTotals(ttlA[k], ttlB[k]);
      } else {
        ttl[k] = ttlB[k];
      }
    }
  });

  return ttl;
};

var calculateFileTotals = function(type, shapes) {
  var idKey = dataFile.getKey(type);
  var fileTotals = [];

  var addToFileTotals = function(totalData, id) {
    if(_.isEmpty(totalData)) { return; }

    var total = _.find(fileTotals, { id: id });

    if(!total) {
      fileTotals.push({
        id: id,
        type: type,
        totals: totalData
      });
    } else {
      total.totals = addTotals(total.totals, totalData);
    }
  };

  var calculateShapeTotal = function(shape) {
    return getCrashes(shape).then(function(crashes) {
      return calculateTotals(crashes.crashes);
    })
    .then(function(totalData) {
      addToFileTotals(totalData, shape.properties[idKey]);
      if(shapes.length === 0) { return fileTotals; }
      return calculateShapeTotal(shapes.pop());
    });
  };

  return calculateShapeTotal(shapes.pop());
};

var saveFileTotals = function(totalData) {
  var updates = _.map(totalData, function(total) {
    return dataMongo.saveTotal(total);
  });

  return Q.allSettled(updates).then(function(results) {
    return true;
  });
};

var calculateAllTotals = function() {

  var runFile = function(fileType) {
    loadFile(fileType).then(function (shapes) {
      return calculateFileTotals(fileType, shapes);
    })
    .then(function(totalData) {
      console.log(totalData);
      process.exit();
      return saveFileTotals(totalData);
    })
    .then(function(result) {
      // if(files.length > 0) {
      //   return runFile(files.pop());
      // }
      return true;
    });
  };

  runFile(files[0]);
};


calculateAllTotals();
