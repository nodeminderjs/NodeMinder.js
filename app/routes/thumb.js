var fs   = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var config = require("../config");
var app    = require("../app");

exports.makeThumbnails = function(req, res) {
  // ToDo: make only one thumbnail
  /*
  var cam;
  if (req.params.id) {
    var cam = '0' + req.params.id;
    cam = cam.substr(cam.length - 2, 2);
  }
  */
    
  // ToDo: copy old thumbnails before create new to allow revert after
  var dir = app.THUMBNAILS_DIR;
  //exec('cp /dev/shm/*.jpg ' + dir, function (error, stdout, stderr) {
    exec(path.join(app.APP_DIR, 'scripts/mkthumb') + ' ' + dir, function (error, stdout, stderr) {
      if (res)
        res.redirect('/thumbnails');
    });
  //});
}
  
exports.viewThumbnails = function(req, res) {
  var dir = app.THUMBNAILS_DIR;
  var thumbs = [];
  fs.readdir(dir, function(err, files) {
    var fsort = files.sort();
    for (var i in fsort) {
      var s = fsort[i];
      if (s[2] == '_') {
        thumbs.push('/images/thumbnails/' + s);
      }       
    }
    res.render('thumb', { title: 'Thumbnails', thumbs: thumbs });
  });
}
