var socket = io.connect(window.location.protocol + '//' + window.location.host, {
  'reconnection limit': 3000,
  'max reconnection attempts': 100000
});

// 'connect' event is emitted when the socket connected successfully
socket.on('connect', function () {
  console.log('connect');
  subscribeCameras(socket);
  $('#alert-disconnect').dialog( 'close' );
});

// 'reconnect' event is emitted when socket.io successfully reconnected to the server
socket.on('reconnect', function () {
  console.log('reconnect');
  //subscribeCameras(socket);
});

socket.on('disconnect', function () {
  console.log('disconnect');
  $('#alert-disconnect').dialog( 'open' );
});

socket.on('info', function(data) {
  var cam = data.camera;
  var id = '#cam' + cam;
  $(id + ' .cfg').text(cam + ' | ' + data.cfg.fps + ' fps | ' + data.cfg.descr);
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

$(function() {
  $('#alert-disconnect').dialog({
    autoOpen: false,
    modal: true,
    dialogClass: 'disconnect'
  });
});

function subscribeCameras(socket) {
  for (var i=0; i<cameras.length; i++) {
    socket.emit('subscribe', { camera: cameras[i] });
  }
}
