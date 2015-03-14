
var fs = require('fs'),
  through = require('through'),
  lodash = require('lodash'),
  Q = require('q'),
  dataFile = require('./data_file'),
  files = ['borough', 'citycouncil', 'community',
           'neighborhood', 'precinct', 'zipcode'];



var loadFile = function(fileType) {
  return dataFile.getShapeFile(fileType).then(function(fileData) {
    var shapes = JSON.parse(fileData);
    console.log(shapes.features[0].properties);
  });
};

var calculateFileTotals = function(shapes) {

};

var saveFileTotals = function(totalData) {

};

var calculateAllTotals = function() {

  var runFile = function(fileType) {
    loadFile(fileType).then(function (shapes) {
      return calculateFileTotals(shapes);
    })
    .then(function(totalData) {
      return saveFileTotals({
        type: fileType,
        data: totalData
      });
    })
    .then(function(result) {
      // if(files.length > 0) {
      //   return runFile(files.pop());
      // }
      return true;
    });
  };

  runFile(files.pop());
};


calculateAllTotals();
