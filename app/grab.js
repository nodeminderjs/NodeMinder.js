/* 
 * Copyright NodeMinder.js
 */
var fs = require('fs');
var execFile = require('child_process').execFile;

var libjs = require('./libjs');

function initCameras(tmpDir) {
  var camerasCfg = cfg.cameras;
  var drivers = [];

  var initArray = [];
  for (var i in camerasCfg) {
    initArray.push(0);
    var c = camerasCfg[i];
    if (drivers.indexOf(c.driver.id) < 0) {
      drivers.push(c.driver.id);
    }
  }
  console.log(drivers);
  for (i in drivers) {
    var driver = require('./driver/' + drivers[i]);
    driver.initCameras(camerasCfg, initArray, tmpDir, processFrame);
  }
}
exports.initCameras = initCameras;

function processFrame(id, filename, pixfmt, width, height) {
  var a = filename.split('.');
  execFile(APP_FFMPEG, 
           [
             '-f', 'rawvideo',
             '-pix_fmt', pixfmt,
             '-s', width + 'x' + height,
             '-i', APP_SHM_DIR + filename,
             '-s', '320x240',
             '-pix_fmt', 'yuvj420p',
             '-y', APP_SHM_DIR + a[0] + '.jpg'
           ],
           function (error, stdout, stderr) {
              if (error !== null) {
                console.log('ffmpeg error: ' + error);
              }
              else {
                //sendFrame(id, a[0] + '.jpg');
              }
  });
}

/*
 * Send jpg image to connected sockets
 */
/*
function sendFrame(cam, jpg, io, st, fps) {
  fs.readFile(APP_SHM_DIR+jpg, 'base64', function(err, data) {
    //if (err) throw err;  // ToDo: log error
    if (err) return;
    
    var s = (Math.round(fps * 10) / 10) + '.0';
    s = s.substr(0,3);

    io.sockets.in(cam).emit('image', {
      server: serverName,
      camera: cam,
      time: libjs.formatDateTime(),
      status: st,
      fps: s,
      //recStart: recStart,
      //jpg: 'data:image/gif;base64,' + data
      jpg: 'data:image/jpeg;base64,' + data
    });
  });
}
*/

/*
 * Calculates the divisor from a required fps and the current receiving frames interval in ms
 * The divisor will be used to disconsider (divisor-1) frames received from grab.c 
 */
function getDivisor(fps, curr_t) {
  var t = 1000/fps;
  var d = t/curr_t;
  d = Math.round(d);
  if (d < 1)
    d = 1;
  return d;
}
