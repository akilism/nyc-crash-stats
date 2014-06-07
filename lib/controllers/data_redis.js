'use strict';

var redis = require('redis'),
  Q = require('q'),
  client = redis.createClient(),
  redisGet = Q.nbind(client.get, client),
  redisSet = Q.nbind(client.set, client),
  redisDel = Q.nbind(client.del, client),
  redisTtl = Q.nbind(client.ttl, client),
  redisExpire = Q.nbind(client.expire, client),
  redisExists = Q.nbind(client.exists, client);

var REFRESH_TIME = 12 * 60 * 60;

var getKey = function (type, identifier, year) {
  return (year) ? type + ':' + identifier + ':' + year : type + ':' + identifier;
};

var getCachedData = function (key) {
  return redisGet(key);
};

var setCachedData = function (key, value) {
  return redisSet(key, value)
    .then(function (reply) {
      return redisExpire(key, 24 * 60 * 60);
    });
};

var delCachedData = function (key) {
  return redisDel(key);
};

var getTtl = function (key) {
  return redisTtl(key);
};

var exists = function (key) {
  return redisExists(key);
};

// Decide to use redis cache and to update cache or not.
var useRedisCache = function (key) {
  return exists(key)
  .then(function (doesExist) {
    if(doesExist === 1) {
      return getTtl(key);
    } else {
      return -1;
    }
  })
  .then(function (ttl) {
    if(ttl === -1) {
      return {'fromCache': false, 'fetch': true};
    }

    if(ttl < REFRESH_TIME) {
      return {'fromCache': true, 'fetch': true};
    }

    return {'fromCache': true, 'fetch': false};
  });
};

module.exports = {
  getKey: getKey,
  getTtl: getTtl,
  exists: exists,
  getCachedData: getCachedData,
  setCachedData: setCachedData,
  delCachedData: delCachedData,
  useRedisCache: useRedisCache
};
