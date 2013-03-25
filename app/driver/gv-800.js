/*
 * Geovision GV-800 dvr card driver
 */
var spawn = require('child_process').spawn;
var exec  = require('child_process').exec;

var DRIVER_ID = 'gv-800';

function initCameras(camerasCfg, initArray, tmpDir, notificationCallback) {
  exec('killall -u $USER nmjs-gv-800', function (error, stdout, stderr) {
    var devices = [];
    var i, c, d, a; 
    
    for (i in camerasCfg) {
      c = camerasCfg[i];
      if (c.driver.id == DRIVER_ID && devices.indexOf(c.driver.device) < 0) {
        devices.push(c.driver.device);
      }
    }
    
    for (i in devices) {
      d = devices[i];
      a = [];

      for (var i in camerasCfg) {
        c = camerasCfg[i];
        if (c.driver.id == DRIVER_ID && c.driver.device == d) {
          a.push(c.id + ':' + c.driver.input);
          initArray[i] = 1;
        }
      }

      /*
       * Spawn grab process for the device
       * ex.: ./nmjs-gv-800 -d /dev/video0 -i 01:0,05:1,09:2,13:3 -t /dev/shm/ 
       */
      console.log(APP_DRIVER_DIR + 'nmjs-gv-800');
      var grab = spawn(APP_DRIVER_DIR + 'nmjs-gv-800',
          [
            '-d', d,
            '-i', a.join(','),
            '-t', APP_SHM_DIR
           ]);

      grab.device = d;
      console.log('spawn: ' + grab.device);

      /*
       * Grab events
       */
      grab.stdout.on('data', function(data) {
        // ex.: data = "F,01,01-1.raw,320,240"
        var a = data.toString().split(',');
        notificationCallback(a[1], a[2], 'bgr24', a[3], a[4]);  
      });

      /*
      grab.on('exit', function(code, signal) {
        //console.log(camSpawn[grab.camera].pid);
        setTimeout(function() {
          grabSpawn[grab.device] = null;
          grabFrame(io, grab.device);
        }, 5000);  // ToDo: parameterize this!
      });

      grab.stderr.on('data', function(data) {
        console.log('grab stderr: ' + data);
      });
      */
      
      //console.log('gv-800', d);
      //console.log(a.join(','));
      //console.log(initArray);
      //console.log('');
    }
  });
}
exports.initCameras = initCameras;
