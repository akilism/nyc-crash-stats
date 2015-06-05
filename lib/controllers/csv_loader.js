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
/*
var chunkWrite = function(buffer) {
  if(countToSave > 100) {
    console.log('**pausing** countToSave:', countToSave);
    this.pause();
    // bulkCrashSave();
  }
  this.queue(buffer);
};

var saving = false;
var bulkCrashSave = function() {
  saving = true;
  var d = new Date();
  console.log('bulkCrashSave started:', d, crashData.length);
  var crashCol = db.collection('crashes');
  var batch = crashCol.initializeUnorderedBulkOp();

  _.forEach(crashData, function(strCrash) {
    var crash = JSON.parse(strCrash);
    batch.find({'unique_key': crash.unique_key}).upsert().updateOne({$set: crash});
  });

  batch.execute(function(err, result) {
    d = new Date();
    console.log('bulkCrashSave complete:', d, crashData.length);
    crashData = [];
    countToSave = 0;
    saving = true;
    chunkQueue.resume();
  });
};

var saveCrash = function(crash) {
  countToSave--;

  if(crash.unique_key === null || isNaN(crash.unique_key)) {
    // console.log(crash);
    return;
  }

  //upsert to mongodb on unique_key
  // console.log('updating:', crash.unique_key, '\nleft to save', countToSave);

  var crashes = db.collection('crashes');
  crashes.update({'unique_key': crash.unique_key},
    {$set: crash},
    {w: 1, 'upsert': true, 'fullResult': false},
    function(err, result) {
     // console.log('updated');
  });

  crash = null;
};

var saveTotals = function() {
  var d = Q.defer();
  var totalsColl = db.collection('totals');
  var saveData = {
    type: 'city',
    id: 'city',
    totals: ttl.totals
  };
  console.log('saving totals:', ttl.totals);
  totalsColl.update({'type': 'city', 'id': 'city'},
    {$set: saveData},
    {w: 1, 'upsert': true, 'fullResult': false},
    function(err, result) {
      console.log(err, result);
      db.close();
      ttl = null;
      d.resolve(true);
  });
  return d.promise;
};

var end = function() {
  this.queue = null;
};

var writeEnd = function() {
  console.log('done');
  deferred.resolve(true);
  // return saveTotals().then(function() {
  //     var shapeTotal = require('./shape_total');
  //     console.log(shapeTotal);
  //     return shapeTotal.calculateAllTotals().then(function() {
  //       deferred.resolve(true);
  //     });
  // });
};

var totalSaved = 0;

var crashTransform = through(crashWrite, writeEnd);

var chunkQueue = through(chunkWrite, end);

var checkPaused = function() {
  console.log('chunkQueue.paused:',chunkQueue.paused, '- ', countToSave);
  if(chunkQueue.paused && countToSave <  10) {
    console.log('**resuming**');
    chunkQueue.resume();
  }
};
*/

var getCrashes = function() {
  var def = Q.defer();

  // console.log('fetching crashes');
  // def.resolve(fs.readFileSync('lib/data/crashes_medium.csv'));
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

var getCrashesLocal = function(path) {

  console.log('processing file:', path);
  var crashCount = 0;
  var crashCol = db.collection('crashes');
  var batch = crashCol.initializeUnorderedBulkOp({w: 1});
  var deferred = Q.defer();
  var crashes = [];
  csv.fromPath(path, {'objectMode': true, 'headers': true})
  .transform(function(data, next) {
    crashWrite(data, next);
  })
  .on('data', function(crash) {
    crashes.push(crash);
    crashCount++; totalSaved++;
    // //console.log('crashCount:', crashCount);
    // batch.find({'unique_key': crash.unique_key}).upsert().updateOne({$set: crash});
    // if(crashCount % 1000 === 0) {
    //   var d = new Date();
    //   var start = Date.now();
    //   console.log('bulkCrashSave:', d, crashCount);
    //   batch.execute();
    //   console.log('execute:', (Date.now() - start));
    //   crashCount = 0;
    //   batch = crashCol.initializeUnorderedBulkOp({w: 1});
    //   console.log('new batch:', (Date.now() - start));
    // }
  })
  .on('end', function() {
    var d = new Date();
    console.log('bulkCrashSave End:', d, crashCount);
    // batch.execute();
    console.log('finished', totalSaved);
    deferred.resolve(true);
  });

  return deferred.promise;
};

var fetchedCrashes = function(crashData) {
  console.log('saving crashes', crashData.length);
  var filePath = './crashData.csv';
  fs.writeFileSync(filePath, crashData);
  return filePath;
};

var splitFile = function(path, filename) {
  return Q.Promise(function(resolve, reject) {
    var child = exec('split -l 2000 ' + filename + ' c_',
      {cwd: path},
      function(error, stdout, stderr) {
        if(error) { reject(error); }
        resolve(path);
      });
  });
};

var getFiles = function(path) {
  return fs.readdirSync(path).filter(function(filename) {
    return filename.indexOf('.csv') === -1;
  });
};
//spawn each job as a new node process
//maybe batch them 10 at a time?

var processFiles = function(files) {
  console.log('processing ' + files.length + ' files.');
  var count = files.length;
  return Q.Promise(function (resolve, reject) {
    var runJob = function(file) {
      var d = Date.now();
      var child = exec('node ./lib/helpers/job-runner.js ' + file, function(error, stdout, stderr) {
        if(error) { reject(error); }
        console.log('finished: ' + file + ' - ' + ((Date.now() - d)/1000) + 'secs');
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
  ttl = new Totaler();
  var def = Q.defer();
  mongoConnection = mongoConnection || config.mongo;
  mc.connect(mongoConnection, function(err, conn) {
      if (err) {console.log('error connecting to mongodb\n', err); return false; }
      if(!err) {
        console.log('connected to mongo database');
        db = conn;
        //getCrashesLocal('./data/crashes_small.csv')
        // getCrashes().then(function(result) {
        //   var path = fetchedCrashes(result);
        //   return getCrashesLocal(path);
        // });
        return splitFile('./splitfiles/', 'crashData.csv')
          .then(function(path) {
            return getFiles(path);
          })
          .then(processFiles)
          .catch(function(e) { console.log('ERROR:' + e); });
        // var fileContents = getFileContents('./crashData.csv');

        // saveCrashes(fileContents);

      }
  });
  return def.promise;
};

module.exports = {
  refreshCrashes:refreshCrashes
};
