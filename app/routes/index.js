/*
 * GET home page.
 */
var fs     = require('fs');

var config = require('../config');
var app    = require('../app');

var video  = require('./video');

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

exports.events = function(req, res) {
  var camera = '0' + req.params.id;
  camera = camera.substr(camera.length - 2, 2);
  res.render('events', { title: 'NodeMinder.js Events',
                         camera: camera,
                         cfg: config.getCamCfg(camera) });
};

exports.video = function(req, res) {
  var camera = '0' + req.params.id;
  camera = camera.substr(camera.length - 2, 2);
  var dir = config.getEventsCfg().dir;
  var file = dir + camera + '/' + req.params.date + '/' + req.params.hour + '.mp4';
  video.videoStreamer(req, res, file);
};

exports.getVideosByDate = function(req, res) {
  var camera = '0' + req.params.id;
  camera = camera.substr(camera.length - 2, 2);
  var dir = config.getEventsCfg().dir;

  fs.readdir(dir + camera + '/' + req.params.date, function(err, files) {
    //if (err) throw err;
    if (!err) {
      //for (f in files.sort()) {
      //  console.log(files[f]);
      //}
      
      res.json(files.sort());
    } else {
      res.json([]);
    }
  });
}