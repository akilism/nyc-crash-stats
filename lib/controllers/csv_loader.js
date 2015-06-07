'use strict';

var through = require('through'),
  csv = require('fast-csv'),
  http = require('http'),
  mc = require('mongodb').MongoClient,
  _ = require('lodash'),
  config = require('../config/config'),
  Q = require('q'),
  fs = require('fs'),
  readline = require('readline'),
  stream = require('stream'),
  // $ = require('highland'),
  gc = require('../helpers/nyc-geoclient'),
  asyncP = require('../helpers/asyncp'),
  Totaler = require('../helpers/totaler'),
  dataMongo = require('./data_mongo'),
  exec = require('child_process').exec,
  countToSave = 1,
  locations = {},
  crashData = [],
  ttl,
  db;

var getCrashes = function() {
  var def = Q.defer();

  console.log('fetching crashes');
  http.get('http://data.cityofnewyork.us/api/views/h9gi-nx95/rows.csv?accessType=DOWNLOAD', function(response) {

    response.on('error', function(err) { console.log('error downloading file:', new Date(), err); process.exit(1); });

    var fileData = '';
    response.on('data', function(chunk) {
      fileData += chunk;
    });

    response.on('end', function() {
      console.log('received crashes:', fileData.length);

      def.resolve(fileData);
    });
  });
  return def.promise;
};

var fetchedCrashes = function(crashData) {
  console.log('saving crashes', crashData.length);
  var filePath = './splitfiles/crashData.csv';
  fs.writeFileSync(filePath, crashData);
  crashData = null;
  return filePath;
};

var splitFile = function(path) {
  var i = path.lastIndexOf('/');
  var filename = path.slice(i+1);
  var dir = path.slice(0,i);
  console.log(dir, filename);
  return Q.Promise(function(resolve, reject) {
    var child = exec('split -l 2000 ' + filename + ' c_',
      {cwd: dir},
      function(error, stdout, stderr) {
        if(error) { reject(error); }
        resolve(dir);
      });
  });
};

var getFiles = function(path) {
  return fs.readdirSync(path).filter(function(filename) {
    return filename.indexOf('.csv') === -1;
  });
};

var processFiles = function(files) {
  console.log('processing ' + files.length + ' files.');
  var count = files.length;
  return Q.Promise(function (resolve, reject) {
    var runJob = function(file) {
      var d = Date.now();
      console.log('starting: ' + file);
      var child = exec('node ./lib/helpers/job-runner.js ' + file, function(error, stdout, stderr) {
        console.log('finished: ' + file + ' - ' + ((Date.now() - d)/1000) + 'secs');
        console.log(stdout, stderr, error);
        if(error) { console.log('error:' + error); reject(error); }
        if(files.length > 0) {
          runJob(files.pop());
        } else {
          resolve(stdout);
        }
      });
    };

    runJob(files.pop());
  });
};

var refreshCrashes = function(mongoConnection) {
  //ttl = new Totaler();
  return getCrashes().then(function(result) {
    var path = fetchedCrashes(result);
    result = null;
    return splitFile(path);
  })
  .then(getFiles)
  .then(processFiles)
  .catch(function(e) { console.log('ERROR:' + e); });
};

module.exports = {
  refreshCrashes:refreshCrashes
};
