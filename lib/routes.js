'use strict';

var api = require('./controllers/api'),
    index = require('./controllers');

/**
 * Application routes
 */
module.exports = function(app) {

  // Server API Routes
  app.route('/api/base')
    .get(api.baseData);

  app.route('/api/feature')
    .get(api.feature);

  app.route('/api/location')
    .get(api.location);

  // Geodata routes.
  app.route('/api/geo/borough')
    .get(api.borough);

  app.route('/api/geo/citycouncil')
    .get(api.citycouncil);

  app.route('/api/geo/community')
    .get(api.community);

  app.route('/api/geo/neighborhood')
    .get(api.neighborhood);

  app.route('/api/geo/precinct')
    .get(api.precinct);

  app.route('/api/geo/subway')
    .get(api.subway);

  app.route('/api/geo/zipcode')
    .get(api.zipcode);

  // All undefined api routes should return a 404
  app.route('/api/*')
    .get(function(req, res) {
      res.send(404);
    });

  // All other routes to use Angular routing in app/scripts/app.js
  app.route('/partials/*')
    .get(index.partials);
  app.route('/')
    .get( index.index);
};
