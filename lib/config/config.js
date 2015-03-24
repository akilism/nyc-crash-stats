'use strict';

var _ = require('lodash');

/**
 * Load environment configuration
 */
var env = process.env.NODE_ENV || 'development';
module.exports = _.merge(
    require('./env/all.js'),
    require('./env/' + env + '.js') || {});
