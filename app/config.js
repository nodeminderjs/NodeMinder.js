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

function getCamCfg(id) {
  return cfg.cameras[id];
}

function getCamerasCfg() {
  return cfg.cameras;
}

function getServerCfg() {
  return cfg.server;
}

function getEventsCfg() {
  return cfg.events;
}

function saveConfigToTmp() {
  /*
   * Save config file in /tmp in the format:
   * cam,descr,local,device,channel,format,palette,width,height,fps,rec_on,pixel_limit,image_limit
   * |01|descr|local|/dev/video0|0|NTSC|BGR24|320|240|3|1|6|2|
   * ...
   * |server|8080|
   */
  var c = cfg.cameras;
  var s = '';

  for (var k in c) {
    var v = c[k];
    s = s + '|' + k + '|' + v.descr + '|' + v.type + '|' + v.device + '|' + v.channel;
    s = s + '|' + v.format + '|' + v.palette + '|' + v.width + '|' + v.height + '|' + v.fps;
    s = s + '|' + v.recording.rec_on;
    s = s + '|' + v.recording.change_detect.pixel_limit;
    s = s + '|' + v.recording.change_detect.image_limit;
    s = s + '|\n';
  }

  s = s + '|server|' + cfg.server.port + '|\n';
  
  s = s + '|events|' + cfg.events.dir + '|';
  
  fs.writeFileSync('/tmp/nodeminderjs_grabc.conf', s);
}

exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getCamCfg = getCamCfg;
exports.getCamerasCfg = getCamerasCfg;
exports.getServerCfg = getServerCfg;
exports.getEventsCfg = getEventsCfg;
