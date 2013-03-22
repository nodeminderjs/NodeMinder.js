/*
 * Alarm
 */
var fs = require('fs');

var config = require('./config');
var libjs  = require('./libjs');

function getAlarmInfo(socket, data) {
  var dt = data.datetime;    // '2013-03-11 104302'
  var d  = dt.substr(0,10);  // '2013-03-11'
  var t  = dt.substr(11,6);  // '104302'
  console.log('getAlarmInfo: cam=' + data.camera + ', datetime=' + dt);
  getAlarmEvents(data.camera, d, t, function(events){
    socket.emit('alarm_info', {
      camera: data.camera,
      date: d,
      time: t,
      events: events
    });
  });
}
exports.getAlarmInfo = getAlarmInfo;

// ToDo: process events of the next day! Ex.: 115800, 115930, 000127, ...
// ToDo: process current recording
function getAlarmEvents(camera, date, time, callback) {
  var dir = config.getEventsCfg().dir;
  fs.readdir(dir + camera + '/' + date, function(err, files) {
    //if (err) throw err;
    if (!err) {
      //var currDate = libjs.getLocalDate(d).toISOString().substr(0,10);  // Ex.: '2012-02-18'
      var events = [];
      for (var i in files.sort()) {
        var s = files[i].substr(0,6);
        if (s >= time)
          events.push(date+' '+s.substr(0,2)+':'+s.substr(2,2)+':'+s.substr(4,2));
      }
      callback(events);
    } else {
      callback([]);
    }
  });
}
