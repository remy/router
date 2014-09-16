'use strict';
var matcher = require('./matcher');

var METHODS      = ['get', 'post', 'put', 'del'   , 'delete', 'head', 'options'];
var HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'DELETE', 'HEAD', 'OPTIONS'];

var noop = function() {};
var error = function(res) {
  return function() {
    res.statusCode = 404;
    res.end();
  };
};
var router = function() {
  var methods = {};
  var traps = {};

  HTTP_METHODS.forEach(function(method) {
    methods[method] = [];
  });

  var route = function(req, res, next) {
    var method = methods[req.method];
    var trap = traps[req.method];
    var index = req.url.indexOf('?');
    var url = index === -1 ? req.url : req.url.substr(0, index);
    var i = 0;

    req.originalURL = url;

    next = next || error(res);
    if (!method) {
      return next();
    }

    var loop = function(err) {
      if (err) {
        return next(err);
      }
      while (i < method.length) {
        var route = method[i];

        i++;

        // allow the user to update the url from inside their middleware
        var index = req.url.indexOf('?');
        var url = index === -1 ? req.url : req.url.substr(0, index);

        req.params = route.pattern(url);
        if (!req.params) {
          continue;
        }

        route.fn(req, res, loop);
        return;
      }
      if (!trap) {
        return next();
      }
      trap(req, res, next);
    };

    loop();
  };

  METHODS.forEach(function(method, i) {
    route[method] = function(pattern, fn) {
      if (Array.isArray(pattern)) {
        pattern.forEach(function(item) {
          route[method](item, fn);
        });
        return;
      }

      (route.onmount || noop)(pattern, fn);

      if (typeof pattern === 'function') {
        traps[HTTP_METHODS[i]] = pattern;
        return route;
      }

      methods[HTTP_METHODS[i]].push({
        pattern:matcher(pattern),
        fn:fn
      });
      return route;
    };
  });
  route.all = function(pattern, fn) {
    METHODS.forEach(function(method) {
      route[method](pattern, fn);
    });
    return route;
  };

  return route;
};

module.exports = router;