// Copyright NodeMinder.js
//
var express = require('express')
  , routes  = require('./routes')
  , http    = require('http')
  , path    = require('path')
  , fs      = require('fs')
  , exec    = require('child_process').exec;

var grab     = require("./grab"),   // use c code to grab frames
    config   = require("./config"),
    alarm    = require("./alarm"),
    registry = require("./registry");

var formatDateTime = require('./libjs').formatDateTime;
var sleepSync      = require('./libjs').sleepSync;

var app = express();
var server = http.createServer(app),
    io = require('socket.io').listen(server, { log: false });

var TMP_DIR = '/dev/shm/';  // temp dir to store grabbed frames and recording frames buffers
var APP_DIR = __dirname;
var THUMBNAILS_DIR = __dirname + '/public/images/thumbnails';
var BASH_DIR = __dirname + '/scripts';

exports.TMP_DIR = TMP_DIR;
exports.APP_DIR = APP_DIR;
exports.THUMBNAILS_DIR = THUMBNAILS_DIR;
exports.BASH_DIR = BASH_DIR;

/*
 * Read config file
 */
config.loadConfig();
var serverCfg = config.getServerCfg();

// create custom grid dir
dir = config.getCustomCfg().dir;
if (!fs.existsSync(dir))
  fs.mkdirSync(dir);  // ToDo: change mode
dir = config.getCustomCfg().grid;
if (!fs.existsSync(dir))
  fs.mkdirSync(dir);  // ToDo: change mode

// create thumbnails dir
if (!fs.existsSync(THUMBNAILS_DIR))
  fs.mkdirSync(THUMBNAILS_DIR);  // ToDo: change mode

// load and initialize registry data
registry.loadRegistry();

/*
 * Initialize cameras
 */
var cameras = config.getCamerasCfg(), dir, c;

for (c in cameras) {
  // create buffer dirs to store event recordings frames
  for (var i=1; i<=3; i++) {
    dir = TMP_DIR + c + '-' + i;
    if (!fs.existsSync(dir))
      fs.mkdirSync(dir);
    else
      exec('rm ' + TMP_DIR + c + '-' + i + '/*.jpg', function (error, stdout, stderr) {
        //if (error !== null) {
        //  console.log('exec error: ' + error);
        //}
      });
  }
  
  // create event recordings dir
  dir = config.getEventsCfg().dir + c + '/';  // ToDo: use a more secure way to join paths
  if (!fs.existsSync(dir))
    fs.mkdirSync(dir);  // ToDo: change mode
}

sleepSync(100);

//exec('echo $PATH', function (error, stdout, stderr) {console.log('$PATH='+stdout)});

/*
 * Start one grab process for each device
 */
var devices = [];
for (c in cameras)
  if ( devices.indexOf(cameras[c].device) == -1 )
    devices.push(cameras[c].device);

for (i in devices.sort()) {
  console.log(devices[i]);
}

//exec('/usr/bin/killall -u $USER grab')
exec('killall -u $USER grab', function (error, stdout, stderr) {
  //var delay = 100;
  for (i in devices.sort()) {
    var t0 = Date.now();
    console.log('starting grab for ' + devices[i] + ' at ' + Date.now());
    grab.grabFrame(io, devices[i]);    // run process to grab and compare frames
    sleepSync(100);
  }
});

// check if thumbnails exists, if not, create them
setTimeout(function() {
  exec(BASH_DIR+'/chthumb ' + THUMBNAILS_DIR + ' ' + BASH_DIR+'/mkthumb', function (error, stdout, stderr) {});
}, 2000);

/*
 * Configure express app
 */
var port;
if (process.argv[2])
  port = process.argv[2];
else
  port = serverCfg.port;

app.configure(function(){
  app.set('port', process.env.PORT || port);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

/*
 * routes
 */
app.get('/', routes.index);
app.get('/grid/:custom?', routes.grid);
app.get('/view/:id/:custom?', routes.view);
app.get('/events/:id', routes.events);
app.get('/video/:id/:date/:hour', routes.video);
app.get('/ajax/videos/:id/:date/:hour?', routes.getVideosByDate);
app.post('/ajax/save/grid/:id?', routes.saveCustomGrid);
app.get('/ajax/load/grid/:id?', routes.loadCustomGrid);
app.get('/thumbnails/make/:id?', routes.makeThumbnails);  // ToDo: change to post
app.get('/thumbnails', routes.viewThumbnails);

/*
 * socket.io events
 */
io.sockets.on('connection', function (socket) {
  var address = socket.handshake.address;
  console.log('connection - socket:' + socket.id + ", from " + address.address + ":" + address.port);

  socket.on('disconnect', function() {
    console.log('disconnect - socket:' + socket.id);
  });

  socket.on('subscribe', function(data) {
    socket.emit('info', {
      camera: data.camera,
      cfg:    config.getCamCfg(data.camera)      
    });
    socket.join(data.camera);
  });

  socket.on('get_alarm_info', function(data) {
    alarm.getAlarmInfo(socket, data);
  });
  
  socket.on('registry_search', function(data) {
    registry.search(socket, data);
  });
});

/*
 * Start server
 */
server.listen(app.get('port'), function(){
  console.log('[' + formatDateTime('y-mm-dd hh:nn') + '] ' + 
              'Express server listening on port ' + app.get('port'));
});
