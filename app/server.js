// Copyright NodeMinder.js
//
var app = require('http').createServer(handler),
    io  = require('socket.io').listen(app, { log: false }),
    fs  = require('fs'),
    formatDateTime = require('./libjs').formatDateTime;

var route;

function start(route_func, grab_func) {
  route = route_func;
  
  app.listen(8080);
  console.log('[' + formatDateTime('y-mm-dd hh:nn') + '] Server listening on port 8080...');

  // ToDo: rewrite this to multiple users connected
  io.sockets.on('connection', function(socket) {
    console.log('connection - socket:' + socket.id);
    grab_func(socket, '01', '/dev/video0');
    grab_func(socket, '02', '/dev/video1');
    
    //setInterval(function() {
    //  grab_func(socket);
    //}, 333);
  });
  
}

function handler(req, res) {
  route(req, res);
  
  fs.readFile(__dirname + '/client/index.html', function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}

exports.start = start;
