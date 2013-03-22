/*
 * Geovision GV-800 dvr card driver
 */
var exec = require('child_process').exec;

var DRIVER_ID = 'gv-800';

function initCameras(camerasCfg, initArray, tmpDir, notificationCallback) {
  exec('killall -u $USER nmjs-gv-800', function (error, stdout, stderr) {
    var devices = [];
    var i, c, d, s; 
    
    for (i in camerasCfg) {
      c = camerasCfg[i];
      if (c.driver.id == DRIVER_ID && devices.indexOf(c.driver.device) < 0) {
        devices.push(c.driver.device);
      }
    }
    
    for (i in devices) {
      d = devices[i];
      s = '/' + d + '/';

      for (var i in camerasCfg) {
        c = camerasCfg[i];
        if (c.driver.id == DRIVER_ID && c.driver.device == d) {
          s += c.id + '/' + c.driver.input + '/';
          initArray[i] = 1;
        }
      }

      console.log('gv-800', d);
      console.log(s);
      console.log(initArray);
      console.log('');
    }
  });
}
exports.initCameras = initCameras;
