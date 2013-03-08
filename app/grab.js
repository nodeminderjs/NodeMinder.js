// Copyright NodeMinder.js
//
var spawn = require('child_process').spawn;
var exec  = require('child_process').exec;
var fs    = require('fs');

var config = require('./config');
var libjs  = require('./libjs');

var REC_AFTER_TIME  =  3;     // number of seconds to record after idle
var MAX_VIDEO_TIME  = 60;     // max video time in seconds
var FPS_UPDATE_TIME = 20;     // refresh update time for cameras not recording or in idle state

var UPDATE_TMS_INTERVAL = 5;  // update tms and divs interval - every n seconds

var TMP_DIR = '/dev/shm/';    // temp dir to store grabbed frames and recording frames buffers

var REC_MODE_NONE       = 0;
var REC_MODE_DETECT     = 1;
var REC_MODE_CONTINUOUS = 2;

var serverName = '';

var grabSpawn = {};
var cameras = {};

function grabFrame(io, device) {
  if (grabSpawn[device]) {
    return;
  }

  if (!serverName)
    serverName = config.getServerCfg().name;

  /*
   * Spawn grab process for the device 
   */
  var grab = spawn('grabc/grab',
                   [
                     '-d', device
                   ]);
  
  grabSpawn[device] = grab;
  grab.device = device;

  /*
   * grab events
   */
  grab.stdout.on('data', function(data) {
    // Commands:
    // "J01-1 C"  - avaiable jpeg image from camera 01 (01-1.jpg), change detected
    // "J02-3 I"  - avaiable jpeg image from camera 02 (02-3.jpg), idle - no change detected
    var msg = data.toString('ascii').substr(0,7);
    var cmd = msg[0];
    var cam = msg.substr(1,2);
    var jpg = msg.substr(1,4) + '.jpg';
    var st  = msg[6];
    //var f, fname, dir

    var t   = Date.now();
    var d   = new Date();
    var c   = cameras[cam];

    if (!c) {
      c = initCamera(cam);
    }
  
    if (cmd == 'J') {
      // Every n_frames update tms and divs 
      updateTmsDiv(c, t);
      
      // Send jpeg image to connected sockets
      if (!(c.frameCount++ % c.div))
        sendFrame(cam, jpg, io, st, 1000/c.tms/c.div);

      // Process event recording
      if (c.rec) {
        if ((st == 'C' || c.rec == REC_MODE_CONTINUOUS) && (!c.recording)) {
          startRecording(c, d, t);
        }
        
        if ((c.rec == REC_MODE_DETECT) && (st == 'C') && (c.recording)) {
          c.recStopAfterMs = t + c.recAfterMs;
        }
        
        // Save frame
        if (c.recording) {
          if ( !(c.recFrame++ % c.rec_div) ) {
            if ( (t >= c.recStopMs) || 
                 ((c.rec == REC_MODE_DETECT) && (t >= c.recStopAfterMs)) ) {
              // stop recording
              c.recording = false;
            }
            // save frame to recording buffer
            saveFrame(c, jpg, t);
          }
        }
        else {
          // not recording (idle) - copy the frame to the next recording buffer
          if ( !(c.recFrame++ % c.rec_div) )
            saveFrame000(c, jpg);
        }
      }   // if (rec)
    }     // if (cmd == 'J')
  });     // grab.stdout.on('data',

  grab.stderr.on('data', function(data) {
    console.log('grab stderr: ' + data);
  });
  
  grab.on('exit', function(code, signal) {
    //console.log(camSpawn[grab.camera].pid);
    setTimeout(function() {
      grabSpawn[grab.device] = null;
      grabFrame(io, grab.device);
    }, 5000);  // ToDo: parameterize this!
  });
}

function initCamera(cam) {
  var c = cameras[cam] = {};
  c.cam = cam;
  // Get camera cfg
  c.cfg = config.getCamCfg(cam);
  c.frameCount = 0;

  c.time    = Date.now();  // current frame receiving time in ms for the camera
  c.tms     = 300;         // current camera tms (time between frames in ms)
  c.div     = 1;           // normal divisor - skip (divisor-1) frames - if(frame%divisor) skip;
  c.rem_div = 1;
  c.rec_div = 1;
  c.frame   = 1;
  c.n_frames = Math.round(c.cfg.fps * 3);  // every n_frames update tms and divs
  c.sum_tms = 0;

  // Event recording vars
  c.rec    = c.cfg.recording.rec_on;  // recording on (1-detect,2-continuous) / off (0)
  c.recDir = config.getEventsCfg().dir + cam + '/';  // this camera events dir
  c.framesDir      = '';            // temp buffer for recording frames - Ex.: /dev/shm/05-1/
  c.recStartDate   = '';            // recording starting date/time
  c.lastStartDate  = 'nd';
  c.recStartTime   = '';            // Ex.: '104735'
  c.recTimeStamp   = '';            // Ex.: '2012-02-18-104735-'
  c.recStartMs     = 0;             // recording start time in ms
  c.recStopMs      = 0;             // recording stop time in ms
  c.recCurrentMs   = 0;             // recording current time in ms
  c.recAfterMs     = REC_AFTER_TIME * 1000;   // number of ms to record after idle
  c.recStopAfterMs = 0;                       // recording stop time after idle
  c.recMaxMs       = MAX_VIDEO_TIME * 1000;   // max video time in ms
  c.recording      = false;    
  c.recBuffer      = 1;             // recording saved frames buffer used - 1..3

  return c;
}

function updateTmsDiv(c, t) {
  c.sum_tms += t - c.time;          // sum tms
  c.time = t;
  if (c.frame >= c.n_frames) {
    // update tms and divs
    c.tms     = c.sum_tms / c.frame;
    c.div     = getDivisor(c.cfg.fps, c.tms);
    c.rem_div = getDivisor(c.cfg.remote_fps, c.tms);
    c.rec_div = getDivisor(c.cfg.recording.rec_fps, c.tms);
    c.sum_tms = 0;
    c.frame   = 1;
    c.n_frames = Math.round(c.cfg.fps * UPDATE_TMS_INTERVAL);
  } else {
    c.frame++;
  }
}

/*
 * Send jpg image to connected sockets
 */
function sendFrame(cam, jpg, io, st, fps) {
  fs.readFile(TMP_DIR+jpg, 'base64', function(err, data) {
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
      //jpg: 'data:image/gif;base64,' + data
      jpg: 'data:image/jpeg;base64,' + data
    });
  });
}

function startRecording(c, d, t) {
  c.recording = true;
  c.recFrame = 0;
  c.recFrameCount = 0;

  c.recStartDate = libjs.getLocalDate(d).toISOString().substr(0,10);  // Ex.: '2012-02-18'
  var s = libjs.formatDateTime(d);
  c.recStartTime = s.substr(0,2) + s.substr(3,2) + s.substr(6,2);  // Ex.: '104735'
  c.recTimeStamp = c.recStartDate + '-' + c.recStartTime + '-';    // Ex.: '2012-02-18-104735-'

  c.recStartMs     = t;
  c.recStopMs      = c.recStartMs + c.recMaxMs;
  c.recStopAfterMs = c.recStartMs + c.recAfterMs;

  c.framesDir = TMP_DIR + c.cam + '-' + c.recBuffer + '/';
  //c.recBuffer = c.recBuffer++ % 3 + 1;
  c.recBuffer++;
  if (c.recBuffer > 3)
    c.recBuffer = 1;

  // if date changed, check if exists an event dir for the date
  if (c.recStartDate != c.lastStartDate) {
    c.lastStartDate = c.recStartDate;
    if (!fs.existsSync(c.recDir + c.recStartDate))   // ToDo: try to use async version
      fs.mkdirSync(c.recDir + c.recStartDate);       // ToDo: try to use async version
  }
}

/*
 * Save frame
 */
function saveFrame(c, jpg, t) {
  var recFrameCount = ++(c.recFrameCount);
  var recTimeStamp = c.recTimeStamp;
  var framesDir = c.framesDir;
  var f = '00000' + recFrameCount;
  var fname = framesDir + recTimeStamp + f.substr(f.length-5, 5) + '.jpg';
  var recording = c.recording;  // false to stop recording!
  var recStartMs = c.recStartMs;
  var recStartDate = c.recStartDate;
  var stopMs = t;
  
  fs.readFile(TMP_DIR+jpg, function(err, data) {
    fs.writeFile(fname, data, function(err) {
      //if (err) throw err;  // ToDo: log error instead of throw
      if (!recording) {
        // Stop recording - create video
        fs.exists(framesDir + '00000.jpg', function (exists) {
          if (exists) {
            fs.rename(framesDir + '00000.jpg',
                      framesDir + recTimeStamp + '00000.jpg', function (err) {
              // if (err) throw err;  // ToDo: log error
              var fps = ((recFrameCount + 1) / (stopMs - recStartMs)) * 1000;
              createVideo(c, recStartDate, recTimeStamp, framesDir, fps);
            });
          }
          else {
            var fps = ((recFrameCount) / (stopMs - recStartMs)) * 1000;
            createVideo(c, recStartDate, recTimeStamp, framesDir, fps);
          }
        });  // fs.exists
      }
    });
  });
}

function createVideo(c, recStartDate, recTimeStamp, framesDir, fps) {
  if (c.cam == '05')
    console.log(libjs.formatDateTime() + ' - ffmpeg spawn, Date.now()=' + Date.now() + ', fps =' + fps);
  
  fps = Math.round(fps * 1000) / 1000;

  var fname = c.recDir + recStartDate + '/' + recTimeStamp.substr(11,6) + '.mp4'; 
  
  var ffmpeg = spawn('ffmpeg', [          // ToDo: configure ffmpeg location
                 '-r',       fps,
                 '-f',       'image2',
                 '-i',       framesDir + recTimeStamp + '%05d.jpg',
                 '-pix_fmt', 'yuv420p',
                 '-preset',  'veryfast',  // medium (default), fast, faster or veryfast
                 '-y',
                 fname
               ]);

  // save rm mask because ffmpeg can delay and have started another recording
  ffmpeg.filesToRemove = framesDir + recTimeStamp + '*.jpg';
                
  ffmpeg.on('exit', function(code, signal) {
    if (c.cam == '05')
      console.log(libjs.formatDateTime() + ' - ffmpeg exit,  Date.now()=' + Date.now() + ', code=' + code + ', signal=' + signal);

    removeFrames(ffmpeg.filesToRemove);
  });
}

function saveFrame000(c, jpg) {
  var recBuffer = c.recBuffer;
  // not recording (idle) - copy the frame to the next recording buffer
  fs.readFile(TMP_DIR+jpg, function(err, data) {
    var dir = TMP_DIR+c.cam + '-' + recBuffer + '/';
    fs.writeFile(dir + '00000.jpg', data, function (err) {
      //if (err) throw err;  // ToDo: log error instead of throw
    });
  });
}

function removeFrames(mask) {
  console.log('rm ' + mask);
  exec('rm ' + mask, function (error, stdout, stderr) {
    if (error !== null) {
      console.log('removeFrames: exec error: ' + error);
    }
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

exports.grabFrame = grabFrame;
