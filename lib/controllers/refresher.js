var refresh = require('./csv_loader');

refresh.refreshCrashes('mongodb://localhost:27017/crashstats').then(console.log);
