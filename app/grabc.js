// Copyright NodeMinder.js
//
var spawn = require('child_process').spawn;
var fs    = require('fs'); 

var formatDateTime = require('./libjs').formatDateTime;

function grabFrame(socket, camera, device) {
  var grab = spawn('grabc/grabc',
                   [
                     '-c', camera,
                     '-d', device
                   ]);

  socket.on('disconnect', function() {
    console.log('disconnect - socket:' + socket.id);
    grab.kill();
  });

  //
  // grab
  //

  grab.stdout.on('data', function(data) {
    // Commands:
    // J01 - avaiable jpeg image of camera 1 in /dev/shm/cam01.jpg
    var msg = data.toString('ascii').substr(0,3);
    var cmd = msg[0];
    var cam = msg.substr(1,2);
  
    if (cmd == 'J') {
      fs.readFile('/dev/shm/cam'+cam+'.jpg', 'base64', function(err, data) {
        if (err) throw err;
        socket.emit('image'+cam, {
           time: formatDateTime(),
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
