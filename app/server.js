// Copyright NodeMinder.js
//
var app = require('http').createServer(handler),
    io  = require('socket.io').listen(app, { log: false }),
    fs  = require('fs');
    
var formatDateTime = require('./libjs').formatDateTime;

function start(grab_func) {
  app.listen(8080);
  console.log('[' + formatDateTime('y-mm-dd hh:nn') + '] Server listening on port 8080...');

  io.sockets.on('connection', function(socket) {
    console.log('io connection');
    grab_func(socket);
    setInterval(function() {
      grab_func(socket);
    }, 333);
  });
}

function handler(req, res) {
  fs.readFile(__dirname + 'client/index.html', function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}

exports.start = start;
