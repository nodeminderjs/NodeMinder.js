/*
 * EasyCAP (model 002) DVR USB 2.0 device driver
 */
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

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

    console.log('easycap');
    console.log(a.join(','));
    console.log(initArray);
    console.log('');
  });
}
exports.initCameras = initCameras;
