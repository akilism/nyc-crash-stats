'use strict';
var dotenv = require('dotenv');
dotenv.load();

module.exports = {
  env: 'development',
  mongo: process.env.MONGOLOCAL
  // mongo: process.env.MONGOHQ
};


