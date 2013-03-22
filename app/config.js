/* 
 * Copyright NodeMinder.js
 */
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
  for (var i in cfg.cameras) {
    var c = cfg.cameras[i];
    if (c.id === id)
      return c;
  }
  return null;
}

exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getCamCfg = getCamCfg;
