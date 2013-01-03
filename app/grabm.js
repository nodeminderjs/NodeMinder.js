// Copyright NodeMinder.js
//
var spawn = require('child_process').spawn;
var fs    = require('fs'); 

function grabFrame(socket) {
  //var grab = spawn('/usr/bin/motion',
  var grab = spawn('/home/user/share/motion/motion-svn-trunk/motion',
                   [
                     '-n',
                     '-c', 'config/motion.conf'
                   ]);
  
  //
  // grab
  //

  grab.stdout.on('data', function(data) {
    // Commands:
    // J01 - avaiable jpeg image of camera 1 in /dev/shm/1.jpg
    // S01 - motion event start in camera 1
    // E01 - motion event end in camera 1
    var msg = data.toString('ascii').substr(0,3);
    var cmd = msg[0];
    var cam = msg.substr(1,2);
  
    if (cmd == 'J') {
      fs.readFile('/tmp/motion/shm/'+cam+'.jpg', 'base64', function(err, data) {
        if (err) throw err;
        socket.emit('image'+cam, {
          'jpg': 'data:image/gif;base64,' + data
        });
      });
    } else {
      socket.emit('status', {
        'cam': cam,
        'st': cmd
      })
    }
  });
}
  
exports.grabFrame = grabFrame;
