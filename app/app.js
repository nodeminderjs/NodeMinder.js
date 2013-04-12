/*
 * Copyright NodeMinder.js 
 */ 
var express  = require('express'),
    routes   = require('./routes'),
    http     = require('http'),
    path     = require('path'),
    fs       = require('fs'),
    exec     = require('child_process').exec;

var grab     = require('./grab'),
    config   = require('./config');

var formatDateTime = require('./libjs').formatDateTime;
var sleepSync      = require('./libjs').sleepSync;

var app = express();
var server = http.createServer(app),
    io = require('socket.io').listen(server, { log: false });

GLOBAL.APP_DIR            = __dirname;
GLOBAL.APP_THUMBNAILS_DIR = __dirname + '/public/images/thumbnails/';
GLOBAL.APP_BASH_DIR       = __dirname + '/scripts/';
GLOBAL.APP_DRIVER_DIR     = __dirname + '/driver/';

/*
 * Read config file and initialize global cfg var
 */
config.loadConfig();

GLOBAL.APP_FFMPEG  = cfg.server.ffmpeg;
GLOBAL.APP_SHM_DIR = cfg.server.shm_dir; // shared memory dir to store grabbed frames

// create custom grid dir
dir = cfg.server.custom_dir;
if (!fs.existsSync(dir))
  fs.mkdirSync(dir);  // ToDo: change mode
dir = cfg.server.custom_grid_dir;
if (!fs.existsSync(dir))
  fs.mkdirSync(dir);  // ToDo: change mode

// create thumbnails dir
if (!fs.existsSync(APP_THUMBNAILS_DIR))
  fs.mkdirSync(APP_THUMBNAILS_DIR);  // ToDo: change mode

// remove temp files from /dev/shm
exec('rm ' + APP_SHM_DIR + '*', function(error, stdout, stderr) {
  /*
   * Initialize cameras
   */
  grab.initCameras(io, APP_SHM_DIR);
});

sleepSync(100);

// check if thumbnails exists, if not, create them
setTimeout(function() {
  exec(APP_BASH_DIR+'chthumb ' + APP_THUMBNAILS_DIR + ' ' + 
                                 APP_BASH_DIR+'mkthumb ' +
                                 APP_SHM_DIR,
                                 function (error, stdout, stderr) {});
}, 2000);

/*
 * Configure express app
 */
var port;
if (process.argv[2])
  port = process.argv[2];
else
  port = cfg.server.port;

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
      server: cfg.server.name,
      camera: data.camera,
      cfg:    CAMERAS_CFG[data.camera]      
    });
    socket.join(data.camera);
  });
});

/*
 * Start server
 */
server.listen(app.get('port'), function(){
  console.log('[' + formatDateTime('y-mm-dd hh:nn') + '] ' + 
              'Express server listening on port ' + app.get('port'));
});
