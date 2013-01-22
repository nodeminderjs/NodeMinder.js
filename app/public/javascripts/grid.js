//var socket = io.connect('http://192.168.1.181:8080/');
var socket = io.connect(window.location.protocol + '//' + window.location.host);

socket.emit('subscribe', { camera: '01' });
socket.emit('subscribe', { camera: '02' });
socket.emit('subscribe', { camera: '03' });
socket.emit('subscribe', { camera: '04' });
socket.emit('subscribe', { camera: '05' });

socket.on('image01', function(data) {
  $('#cam01 img').attr('src', data.jpg);
  $('#cam01 div.info').text(data.time);
});

socket.on('image02', function(data) {
  $('#cam02 img').attr('src', data.jpg);
  $('#cam02 div.info').text(data.time);
});

socket.on('image03', function(data) {
  $('#cam03 img').attr('src', data.jpg);
  $('#cam03 div.info').text(data.time);
});

socket.on('image04', function(data) {
  $('#cam04 img').attr('src', data.jpg);
  $('#cam04 div.info').text(data.time);
});

socket.on('image05', function(data) {
  $('#cam05 img').attr('src', data.jpg);
  $('#cam05 div.info').text(data.time);
  var st = data.status;
  if (st == 'C')
    $('#cam05 .info').addClass('change');
  else
    $('#cam05 .info').removeClass('change');
});
