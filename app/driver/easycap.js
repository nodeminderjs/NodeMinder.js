/*
 * EasyCAP (model 002) DVR USB 2.0 device driver
 */
var spawn = require('child_process').spawn;
var exec  = require('child_process').exec;

var DRIVER_ID = 'easycap';

function initCameras(camerasCfg, initArray, tmpDir, notificationCallback) {
  exec('killall -u $USER nmjs-easycap', function (error, stdout, stderr) {
    var i, c, a = [];

    for (i in camerasCfg) {
      c = camerasCfg[i];
      if (c.driver.id == DRIVER_ID) {
        a.push(c.id + ':' + c.driver.input);
        initArray[i] = 1;
      }
    }

    /*
     * Spawn grab process for the device
     * ex.: ./nmjs-easycap 17:1,18:2 /dev/shm/ 4
     */
    console.log(APP_DRIVER_DIR + 'nmjs-easycap');
    var grab = spawn(APP_DRIVER_DIR + 'nmjs-easycap',
        [
          a.join(','),
          APP_SHM_DIR,
          4            // frames to read
         ]);

    console.log('spawn: easycap');

    /*
     * Grab events
     */
    grab.stdout.on('data', function(data) {
      // ex.: data = "F,17,17-1.raw,320,240"
      var a = data.toString('ascii').split(',');
      notificationCallback(a[1], a[2], 'bgr24', a[3], a[4]);  
    });

    //console.log('easycap');
    //console.log(a.join(','));
    //console.log(initArray);
    //console.log('');
  });
}
exports.initCameras = initCameras;
