var fs   = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var config = require("../config");

exports.makeThumbnails = function(req, res) {
  exec(APP_BASH_DIR+'mkthumb ' + APP_SHM_DIR + ' ' + APP_THUMBNAILS_DIR,
  function (error, stdout, stderr) {
    if (res)
      res.redirect('/thumbnails');
  });
}
  
exports.viewThumbnails = function(req, res) {
  var dir = APP_THUMBNAILS_DIR;
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
