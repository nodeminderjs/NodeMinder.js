// Copyright NodeMinder.js
//
var spawn = require('child_process').spawn;
var fs    = require('fs');
var io    = require('socket.io');

var formatDateTime = require('./libjs').formatDateTime;

var config = require('./config');

var camSpawn = {};

function grabFrame(io, socket, camera) {
  socket.join(camera);

  if (camSpawn[camera]) {
    return;
  }

  var camCfg = config.getCamCfg(camera);
    
  var grab = spawn('grabc/grab',
                   [
                     '-c', camera,
                     '-d', camCfg.device,
                     '-i', camCfg.channel,
                     '-f', camCfg.format,
                     '-p', camCfg.palette,
                     '-w', camCfg.width,
                     '-e', camCfg.height,
                     '-s', camCfg.fps
                   ]);
  
  camSpawn[camera] = grab;

  //
  // grab
  //

  grab.stdout.on('data', function(data) {
    // if no more clients subscribed to this camera, kill the camera process
    if (io.sockets.clients(camera).length == 0) {
      grab.kill();
      camSpawn[camera] = null;
      console.log('kill: ' + camera);
      return;      
    }
    
    // Commands:
    // "J01 C"  - avaiable jpeg image of camera 01, change detected
    var msg = data.toString('ascii').substr(0,5);
    var cmd = msg[0];
    var cam = msg.substr(1,2);
    var st  = msg[4];
  
    if (cmd == 'J') {
      fs.readFile('/dev/shm/cam'+cam+'.jpg', 'base64', function(err, data) {
        if (err) throw err;
        //socket.emit('image'+cam, {
        io.sockets.in(camera).emit('image'+cam, {
           time: formatDateTime(),
           status: st,
           jpg: 'data:image/gif;base64,' + data
        });
      });
    }
  });

  grab.stderr.on('data', function(data) {
    console.log('grab stderr: ' + data);
  });
}
  
exports.grabFrame = grabFrame;
