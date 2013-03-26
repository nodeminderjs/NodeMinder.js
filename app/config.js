/* 
 * Copyright NodeMinder.js
 */
var fs = require('fs');

var cfg;
var camerasCfg;

function loadConfig() {
  cfg = JSON.parse(fs.readFileSync('config/nodeminderjs.conf', 'utf8'));
  GLOBAL.cfg = cfg;
  camerasCfg = {};
  for (var i in cfg.cameras) {
    var c = cfg.cameras[i];
    camerasCfg[c.id] = c;
  }
  GLOBAL.CAMERAS_CFG = camerasCfg;
    
}

function saveConfig() {
  fs.writeFileSync('config/nodeminderjs.conf', JSON.stringify(cfg, null, 4), 'utf8');
}

function getCamCfg(id) {
  return camerasCfg[id];
}

exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getCamCfg  = getCamCfg;
exports.cfg = cfg;
exports.camerasCfg = camerasCfg;
