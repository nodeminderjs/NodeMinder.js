/*
 * GET home page.
 */
var fs     = require('fs');

var config = require('../config');
var app    = require('../app');

var video  = require('./video');
var thumb  = require('./thumb');

exports.index = function(req, res) {
  res.render('index', { title: 'NodeMinder.js', 
                        cameras: config.getCamerasCfg(),
                        sorted:  config.getCamerasSortedArray() });
};

exports.grid = function(req, res) {
  if (req.params.custom)
    var id = req.params.custom;
  else
    var id = '%';    

  var dir = config.getCustomCfg().grid;
  var fname = dir + id + '.json';

  fs.readFile(fname, 'utf8', function(err, data) {
    //if (err) throw err;  // ToDo: log error instead of throw
    if (!err) {
      var custom = JSON.parse(data);
      res.render('grid', { title: 'Grid', 
                           cameras: custom.cameras,
                           size_info: custom.size_info,
                           cfg: config.getCamerasCfg()});
    } else {
      // ToDo: create grid with default cameras set
      var sorted = config.getCamerasSortedArray();
      //var camCfg = config.getCamerasCfg();
      var t = 0;
      var l = 0;
      var cameras = [];
      for (var i=0; i<sorted.length; i++) {
        cameras.push({
          id: 'cam' + sorted[i],
          top: t,
          left: l,
          width: 320,
          height: 240
        });
        if (!((i+1)%4)) {
          t += 240;
          l = 0;
        } else {
          l += 320;
        }
      }
      res.render('grid', { title: 'Grid',
                           cameras: cameras,
                           size_info: {},
                           cfg: config.getCamerasCfg()});
    }
  });
};

exports.view = function(req, res) {
  var cam = '0' + req.params.id;
  cam = cam.substr(cam.length - 2, 2);
  var cameras = [{
    id: 'cam' + cam,
    top: 0,
    left: 0,
    width: 320,
    height: 240
  }];
  res.render('grid', { title: 'View',
                       cameras: cameras,
                       cfg: config.getCamerasCfg() });
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
      if (req.params.hour) {
        var hlist = [];
        for (var i in files.sort()) {
          //console.log(files[f]);
          if (files[i].substr(0,2) == req.params.hour)
            hlist.push(files[i]);
        }
        res.json(hlist);
      }
      else
        res.json(files.sort());
    } else {
      res.json([]);
    }
  });
}

exports.saveCustomGrid = function(req, res) {
  if (req.params.id)
    var id = req.params.id;
  else
    var id = '%';    

  var dir = config.getCustomCfg().grid;
  var fname = dir + id + '.json';
  fs.writeFile(fname, JSON.stringify(req.body, null, 4),
               'utf8', function(err) {
    //if (err) throw err;  // ToDo: log error instead of throw
    if (!err)
      res.send('ok');
    else
      res.send(err.message);
  });
}

/*
 * Client:
 * 
 * function loadConfig() {
 *   $.getJSON(serverUrl + '/ajax/load' + path, function(data) {
 *     size_info = data.size_info;
 *     var cameras = data.cameras;
 */
exports.loadCustomGrid = function(req, res) {
  if (req.params.id)
    var id = req.params.id;
  else
    var id = '%';    

  var dir = config.getCustomCfg().grid;
  var fname = dir + id + '.json';
  fs.readFile(fname, 'utf8', function(err, data) {
    //if (err) throw err;  // ToDo: log error instead of throw
    if (!err)
      res.json(JSON.parse(data));
    else
      res.json({});
  });
}

/*
 * Thumbnails 
 */

exports.makeThumbnails = function(req, res) {
  thumb.makeThumbnails(req, res);
}
  
exports.viewThumbnails = function(req, res) {
  thumb.viewThumbnails(req, res);
}
