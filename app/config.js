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

function getCameraCfg(id) {
  var c = cfg.cameras.filter(function(c) {return c.id == id});
  if (c.length > 0) {
    return c[0];
  } else {
    return null;
  }
}

exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getCameraCfg = getCameraCfg;

