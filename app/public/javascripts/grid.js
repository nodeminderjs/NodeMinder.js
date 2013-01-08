var socket = io.connect('http://192.168.1.181:8080/');
  
socket.emit('subscribe', { camera: '01' });
socket.emit('subscribe', { camera: '02' });

socket.on('image01', function(data) {
  $('#cam01 img').attr('src', data.jpg);
  $('#cam01 div.info').text(data.time);
});

socket.on('image02', function(data) {
  $('#cam02 img').attr('src', data.jpg);
  $('#cam02 div.info').text(data.time);
});

