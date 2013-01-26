var socket = io.connect(window.location.protocol + '//' + window.location.host);

for (var i=0; i<cameras.length; i++) {
  socket.emit('subscribe', { camera: cameras[i] });
}

socket.on('info', function(data) {
  var cam = data.camera;
  var id = '#cam' + cam;
  $(id + ' .cfg').text(data.cfg.descr + ' | ' + cam + ' | ' + data.cfg.fps + ' fps');
});

socket.on('image', function(data) {
  var cam = data.camera;
  var id = '#cam' + cam;
  $(id + ' img').attr('src', data.jpg);
  $(id + ' .time').text(data.time);
  var st = data.status;
  if (st == 'C')
    $(id + ' .info').addClass('change');
  else
    $(id + ' .info').removeClass('change');
});

