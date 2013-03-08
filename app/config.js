// Copyright NodeMinder.js
//
var fs = require('fs');

var cfg;

function loadConfig() {
  cfg = JSON.parse(fs.readFileSync('config/nodeminderjs.conf', 'utf8'));
  GLOBAL.cfg = cfg;
  saveConfigToTmp();
}

function saveConfig() {
  fs.writeFileSync('config/nodeminderjs.conf', JSON.stringify(cfg, null, 4), 'utf8');
}

function getCfg() {
  return cfg;
}

function getCamCfg(id) {
  return cfg.cameras[id];
}

function getCamerasCfg() {
  return cfg.cameras;
}

function getCamerasSortedArray() {
  a = []
  for (c in cfg.cameras)
    a.push(c);
  return a.sort();
}

function getServerCfg() {
  return cfg.server;
}

function getEventsCfg() {
  return cfg.events;
}

function getCustomCfg() {
  return cfg.custom;
}

function saveConfigToTmp() {
  /*
   * Save config file in /tmp in the format:
   * cam,device,channel,descr,type,format,palette,width,height,fps,rec_on,pixel_limit,image_limit
   * |01|/dev/video0|0|descr|local|NTSC|BGR24|320|240|3|1|6|2|
   * ...
   * |devices|2|8|
   * |server|8080|
   * |events|/var/nodeminderjs/events/|
   */
  var c = cfg.cameras;
  var s = '';
  var a = getCamerasSortedArray();  // ToDo: sort array by device/channel

  for (var i in a) {
    var k = a[i];
    var v = c[k];
    s = s + '|' + k + '|' + v.device + '|' + v.channel + '|' + v.descr + '|' + v.type;
    s = s + '|' + v.format + '|' + v.palette + '|' + v.width + '|' + v.height + '|' + v.fps;
    s = s + '|' + v.recording.rec_on;
    s = s + '|' + v.recording.change_detect.pixel_limit;
    s = s + '|' + v.recording.change_detect.image_limit;
    s = s + '|\n';
  }

  s = s + '|devices|' + cfg.devices.captures_per_frame + '|' +
                        cfg.devices.buffers_per_input  + '|\n';

  s = s + '|server|' + cfg.server.port + '|\n';
  
  s = s + '|events|' + cfg.events.dir + '|';
  
  fs.writeFileSync('/tmp/nodeminderjs_grabc.conf', s);
}

exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getCfg = getCfg;
exports.getCamCfg = getCamCfg;
exports.getCamerasCfg = getCamerasCfg;
exports.getCamerasSortedArray = getCamerasSortedArray;
exports.getServerCfg = getServerCfg;
exports.getEventsCfg = getEventsCfg;
exports.getCustomCfg = getCustomCfg;
