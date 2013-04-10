/* 
 * Copyright NodeMinder.js
 */
var fs = require('fs');
var execFile = require('child_process').execFile;

var libjs = require('./libjs');

var io;
var serverName;

var camInfo = {};

var APP_CHANGE;              // app to detect change between two frames
var FPS_UPDATE_INT = 10000;  // fps update interval in ms

function initCameras(socketio, tmpDir) {
  io = socketio;
  serverName = cfg.server.name;
  
  var camerasCfg = cfg.cameras;
  var drivers = [];

  var initArray = [];
  for (var i in camerasCfg) {
    var c = camerasCfg[i];
    var t = Date.now();
    camInfo[c.id] = { 
      'fps'    : {'cfg':c.fps, 'fps':0, 'count':0, 'time':t},
      'change' : {'cfg':c.change_detect, 'count':0, 'frame':'', 'status':'0'}
    };
    initArray.push(0);
    if (drivers.indexOf(c.driver.id) < 0) {
      drivers.push(c.driver.id);
    }
  }

  for (i in drivers) {
    var driver = require('./driver/' + drivers[i]);
    driver.initCameras(camerasCfg, initArray, tmpDir, processFrame);
  }
  
  APP_CHANGE = APP_DIR + '/change/change';  // app to detect change between two frames
}
exports.initCameras = initCameras;

/*
 * Process frame read from the child process
 */
function processFrame(id, filename, pixfmt, width, height) {
  var a = filename.split('.');
  // ffmpeg -v quiet -f image2 -pix_fmt bgr24 -s 320x240 -i /dev/shm/17-4.raw -s 320x240 -pix_fmt yuvj420p -y /dev/shm/18-4.jpg
  execFile(APP_FFMPEG, 
           [
             '-v', 'quiet',      
             '-f', 'image2',      // rawvideo or image2
             '-pix_fmt', pixfmt,
             '-s', width + 'x' + height,
             '-i', APP_SHM_DIR + filename,
             '-s', '320x240',
             '-pix_fmt', 'yuvj420p',
             '-y', APP_SHM_DIR + a[0] + '.jpg'
           ],
           function (error, stdout, stderr) {
              if (error !== null) {
                console.log('cam=' + id + ', ffmpeg error: ' + error);
              }
              else {
                sendFrame(id, a[0] + '.jpg');
              }
           }
  );
  
  // process change detect
  if (camInfo[id].change.cfg.on) {
    var c = camInfo[id].change;
    if (++c.count == c.cfg.frames_int) {
      c.count = 0;
      if (c.frame) {
        execFile(APP_CHANGE, 
           [APP_SHM_DIR + c.frame, APP_SHM_DIR + filename, c.cfg.pixel_limit, c.cfg.image_limit],      
           function (error, stdout, stderr) {
             if (error !== null) {
               console.log('cam=' + id + ', change detect error: ' + error);
             }
             else {
               c.status = stdout.toString();
             }
           }
        );
      }
      c.frame = filename;
    }
  }
}

/*
 * Send jpg image to connected sockets
 */
function sendFrame(cam, jpg) {
  fs.readFile(APP_SHM_DIR+jpg, 'base64', function(err, data) {
    //if (err) throw err;  // ToDo: log error
    if (err) return;
    
    var info = camInfo[cam];
    var fps = info.fps;
    fps.count++;
    var t = Date.now();
    if (t > (fps.time + FPS_UPDATE_INT)) {
      // update fps
      fps.fps = fps.count / (t - fps.time) * 1000;
      fps.time = t;
      fps.count = 0;
    }
    
    io.sockets.in(cam).emit('image', {
      server: serverName,
      camera: cam,
      time: libjs.formatDateTime(),
      fps: fps.fps.toString().substr(0,3),
      status: info.change.status,
      jpg: 'data:image/jpeg;base64,' + data
    });
  });
}

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
