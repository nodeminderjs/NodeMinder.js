// Copyright NodeMinder.js
//
var spawn = require('child_process').spawn;
var fs    = require('fs');

var config = require('./config');
var libjs  = require('./libjs');

var camSpawn = {};

var REC_AFTER_TIME = 3;         // number of seconds to record after idle
var MAX_VIDEO_TIME = 60;        // max video time in seconds = 120s = 2min

function grabFrame(io, camera) {
  var msg, cmd, cam, st, f, fname;
  
  if (camSpawn[camera]) {
    return;
  }

  var camCfg = config.getCamCfg(camera);
    
  var grab = spawn('grabc/grab',
                   [
                     '-c', camera
                   ]);
  
  camSpawn[camera] = grab;
  grab.camera = camera;
  
  /*
   * Recording vars
   */
  var rec = camCfg.recording.rec_on;  // recording on/off
  var recDir = config.getEventsCfg().dir + camera + '/';  // this camera events dir
  var eventDir;
  var recStartDate;  // recording starting date and time
  var recStartTime;
  
  var framesAfter = REC_AFTER_TIME * camCfg.fps;  // number of frames to record after idle
  var maxRecFrames = MAX_VIDEO_TIME * camCfg.fps; // max frames number by video
  var recording = 0;    // when state = 'C' it is set to framesAfter, otherwise ('I') it is decremented
  var recFrame = 0;     // recorded frame number
  
  if (rec)
    if (!fs.existsSync(recDir))
      // create events dir
      fs.mkdirSync(recDir);  // ToDo: change mode
  
  /*
   * grab
   */
  grab.stdout.on('data', function(data) {
    // Commands:
    // "J01 C"  - avaiable jpeg image from camera 01, change detected
    // "J01 I"  - avaiable jpeg image from camera 02, idle - without change detected
    msg = data.toString('ascii').substr(0,5);
    cmd = msg[0];
    cam = msg.substr(1,2);
    st  = msg[4];
  
    if (cmd == 'J') {
      fs.readFile('/dev/shm/cam'+cam+'.jpg', function(err, data) {
        if (err) throw err;
        io.sockets.in(camera).emit('image', {
           camera: cam,
           time: libjs.formatDateTime(),
           status: st,
           jpg: 'data:image/gif;base64,' + data.toString('base64')
        });

        /*
         * Process event recording
         */
        if (rec) {
          if (st == 'C' && recFrame < maxRecFrames) {
            if (recording == 0) {
              // start recording
              d = new Date();
              recStartDate = libjs.getLocalDate(d).toISOString().substr(0,10);
              recStartTime = libjs.formatDateTime(d);
              recFrame = 0;
              if (!fs.existsSync(recDir + recStartDate))
                fs.mkdirSync(recDir + recStartDate);
              eventDir = recDir + recStartDate + '/' +
                         recStartTime.substr(0,2) + 
                         recStartTime.substr(3,2) + 
                         recStartTime.substr(6,2);
              fs.mkdirSync(eventDir);
            }
            recording = framesAfter;
          }
          else {
            if (recording > 0) {
              recording--;
              if (recording == 0) {
                // stop recording - create video
                // ffmpeg -r 2 -f image2 -i "%05d.jpg" out.mp4
                var ffmpeg = spawn('ffmpeg',  // ToDo: configure ffmpeg location
                                    [
                                      '-r',       camCfg.fps,
                                      '-f',       'image2',
                                      '-i',       eventDir + '/%05d.jpg',
                                      '-pix_fmt', 'yuv420p',
                                      eventDir + '.mp4',
                                      '-y'
                                    ]);
                // save eventDir because ffmpeg can delay and in this time have started another recording
                ffmpeg.eventDir = eventDir;
                ffmpeg.on('exit', function(code, signal) {
                  var rm = spawn('rm',
                                 [
                                   ffmpeg.eventDir, '-rf'
                                 ]);
                });
                recFrame = 0;
              }
            }
          }
      
          if (recording > 0) {
            // save frame
            f = '00000' + recFrame;
            fname = eventDir + '/' + f.substr(f.length-5, 5) + '.jpg'; 
            fs.writeFile(fname, data, function (err) {
              //if (err) throw err;  // ToDo: log error instead of throw
            });
            recFrame++;
          }
        } // if (rec)

      }); // fs.readFile(

    }  // if (cmd == 'J')
  }); // grab.stdout.on('data',

  grab.stderr.on('data', function(data) {
    console.log('grab stderr: ' + data);
  });
  
  grab.on('exit', function(code, signal) {
    //console.log(camSpawn[grab.camera].pid);
    setTimeout(function() {
      camSpawn[grab.camera] = null;
      grabFrame(io, grab.camera);
    }, 5000);  // ToDo: parameterize this!
  });
}

exports.grabFrame = grabFrame;
