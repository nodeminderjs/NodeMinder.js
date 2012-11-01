// Copyright NodeMinder.js
//
var spawn = require('child_process').spawn;

var formatDateTime = require('./libjs').formatDateTime;

function grabFrame(socket) {
  var grab   = spawn('grabc/grabc', []),
      ffmpeg = spawn('ffmpeg', [
                                '-loglevel', 'quiet',
                                '-pix_fmt',  'bgr24',
                                '-s',        '320x240',
                                '-f',        'rawvideo',
                                '-i',        'pipe:0',
                                '-f',        'image2',
                                'pipe:1'
                               ],
                               { stdio: ['pipe', 'pipe', 'ignore'] });

  var image64 = '';
  
  grab.stdout.pipe(ffmpeg.stdin);  
  
  //
  // grab
  //

  grab.stderr.on('data', function(data) {
    console.log('grab stderr: ' + data);
  });
  
  //
  // ffmpeg
  //

  ffmpeg.stdout.on('data', function(data) {
    // Convert to base64
    image64 += data.toString('base64');
  });
  
  ffmpeg.on('exit', function(code) {
    if (code !== 0) {
      console.log('ffmpeg process exited with code ' + code);
    }
    // Send to socket
    socket.emit('image', {
        time: formatDateTime(),
        jpg:  'data:image/gif;base64,' + image64
      });
  });
}
  
exports.grabFrame = grabFrame;
