// Copyright NodeMinder.js
//
var fs = require('fs');

var cfg;

function loadConfig() {
  cfg = JSON.parse(fs.readFileSync('config/nodeminderjs.conf', 'utf8'));
  GLOBAL.cfg = cfg;
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

exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getCamCfg = getCamCfg;
exports.getCamerasCfg = getCamerasCfg;