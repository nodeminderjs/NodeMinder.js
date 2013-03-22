/*
 * Registry
 */
var fs = require('fs');

var config = require('./config');

var REGISTRY_DIR;
exports.REGISTRY_DIR = REGISTRY_DIR;

var entities;
var entities_rec = {};

function loadRegistry() {
  REGISTRY_DIR = config.getCfg().registry.dir; 
  if ( !fs.existsSync(REGISTRY_DIR) )
    fs.mkdirSync(REGISTRY_DIR);    // ToDo: change mode

  var dir = REGISTRY_DIR + 'data';
  if (!fs.existsSync(dir))
    fs.mkdirSync(dir);
  
  var filename = REGISTRY_DIR + 'entities.json';
  if ( !fs.existsSync(filename) )
    fs.appendFileSync(filename, '{"entities": {}}');
  entities = (JSON.parse(fs.readFileSync(REGISTRY_DIR + 'entities.json', 'utf8'))).entities;
  
  for (var e in entities) {
    filename = REGISTRY_DIR + e + '.json';
    if ( !fs.existsSync(filename) )
      fs.appendFileSync(filename, '');
    entities_rec[e] = JSON.parse('{' + fs.readFileSync(filename, 'utf8') + '}');
  }
}
exports.loadRegistry = loadRegistry;

function search(socket, data) {
  var id = data['id'].toUpperCase();
  
  for (var e in entities_rec) {
    var rec = entities_rec[e][id];
    if (rec) {
      break;
    }
  }
  
  if (rec)
    socket.emit('registry_info', { found: true, rec: rec });
  else
    socket.emit('registry_info', { found: false, rec: {} });
}
exports.search = search;
