/*
 * GET home page.
 */
var config = require('../config');
var app    = require('../app');

exports.index = function(req, res) {
  res.render('index', { title: 'NodeMinder.js', cameras: config.getCamerasCfg() });
};

exports.grid = function(req, res) {
  var cameras = config.getCamerasCfg();
  a = '';
  for (var c in cameras) {
    a = a + "'" + c + "',";
  }
  res.render('grid', { title: 'NodeMinder.js Grid', cameras: cameras, array: a });
};

exports.view = function(req, res) {
  var camera = '0' + req.params.id;
  camera = camera.substr(camera.length - 2, 2);
  res.render('view', { title: 'NodeMinder.js View', camera: camera });
};
