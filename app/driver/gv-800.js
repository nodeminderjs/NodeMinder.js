/*
 * Geovision GV-800 dvr card driver
 */
var spawn = require('child_process').spawn;
var exec  = require('child_process').exec;

var DRIVER_ID = 'gv-800';
var PROC_NAME = 'nmjs-gv-800-read';

function initCameras(camerasCfg, initArray, tmpDir, notificationCallback) {
  exec('killall -u $USER ' + PROC_NAME, function(error, stdout, stderr) {
    var devices = [];  // devices
    var cameras = [];  // cameras grouped by devices
    var i, j, cfg, dev, cam; 
    
    // initialize devices and cameras arrays
    for (i in camerasCfg) {
      cfg = camerasCfg[i];
      if (!cfg.disabled && cfg.driver.id == DRIVER_ID) {
        j = devices.indexOf(cfg.driver.device);
        if (j < 0) {
          devices.push(cfg.driver.device);
          cameras.push([cfg.id + ':' + cfg.driver.input]);
        }
        else {
          cameras[j].push(cfg.id + ':' + cfg.driver.input);
        }
        initArray[i] = 1;
      }
    }

    // spawn child process for each device
    for (i in devices) {
      dev = devices[i];
      cam = cameras[i];
      
      /*
       * Spawn grab process for the device
       * ex.: ./nmjs-gv-800 -d /dev/video0 -i 01:0,05:1,09:2,13:3 -t /dev/shm/ 
       */
      console.log(APP_DRIVER_DIR + PROC_NAME);
      var grab = spawn(APP_DRIVER_DIR + PROC_NAME,
          [
            '-d', dev,
            '-i', cam.join(','),
            '-t', APP_SHM_DIR
           ]);
      grab.device = dev;

      /*
       * Grab events
       */
      grab.stdout.on('data', function(data) {
        // ex.: data = "F,01,01-1.raw,320,240"
        var a = data.toString().split(',');
        notificationCallback(a[1], a[2], 'bgr24', a[3], a[4]);  
      });

      grab.stderr.on('data', function(data) {
        console.log('grab gv-800 stderr: ' + data);
      });

      /*
      grab.on('exit', function(code, signal) {
        //console.log(camSpawn[grab.camera].pid);
        setTimeout(function() {
          grabSpawn[grab.device] = null;
          grabFrame(io, grab.device);
        }, 5000);  // ToDo: parameterize this!
      });
      */
    }
  });
}
exports.initCameras = initCameras;
