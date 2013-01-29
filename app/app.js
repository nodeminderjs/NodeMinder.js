// Copyright NodeMinder.js
//
var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

var grab   = require("./grab"),   // use c code to grab frames
    config = require("./config");

var formatDateTime = require('./libjs').formatDateTime;

var app = express();
var server = http.createServer(app),
    io = require('socket.io').listen(server, { log: false });

config.loadConfig();
var cameras = config.getCamerasCfg();
for (c in cameras) {
  // run process to grab and compare frames
  grab.grabFrame(io, c);  // ToDo: verify if the process is running. If not, trigger it again!
}

var port = config.getServerCfg().port;

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
app.get('/view/:id', routes.view);

io.sockets.on('connection', function (socket) {
  console.log('connection - socket:' + socket.id);

  socket.on('disconnect', function() {
    console.log('disconnect - socket:' + socket.id);
  });

  socket.on('subscribe', function(data) {
    socket.emit('info', {
      camera: data.camera,
      cfg:    config.getCamCfg(data.camera)      
    });
    socket.join(data.camera);
    //grab.grabFrame(io, data.camera);
  });
});

server.listen(app.get('port'), function(){
  console.log('[' + formatDateTime('y-mm-dd hh:nn') + '] ' + 
              'Express server listening on port ' + app.get('port'));
});
