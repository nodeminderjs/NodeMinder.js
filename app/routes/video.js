/*
 * Based on the code found here:
 * https://github.com/meloncholy/vid-streamer/blob/master/index.js
 * See also:
 * https://gist.github.com/1993068
 */
var fs     = require("fs");
var events = require("events");

var handler = new events.EventEmitter();

exports.videoStreamer = function (req, res, file) {
  var stream;
  var stat;
  var info = {};

  try {
    stat = fs.statSync(file);

    if (!stat.isFile()) {
      handler.emit("badFile", res);
      return false;
    }
  } catch (e) {
    handler.emit("badFile", res, e);
    return false;
  }
  
  info.start = 0;
  info.end = stat.size - 1;
  info.size = stat.size;
  info.modified = stat.mtime;
  info.length = info.end - info.start + 1;
  
  sendHeader(res, info);

  stream = fs.createReadStream(file, { flags: "r", start: info.start, end: info.end });
  stream.pipe(res);
  return true;  
}

sendHeader = function (res, info) {
  var code = 200;
  var header;

  // 'Connection':'close',
  // 'Cache-Control':'private',
  // 'Transfer-Encoding':'chunked'

  header = {
    "Cache-Control": "public",
    "Connection":    "keep-alive",
    "Content-Type":  "video/mp4",
    "Content-Disposition": "inline; filename=" + "out.mp4" + ";"
  };

  header.Pragma = "public";
  header["Last-Modified"] = info.modified.toUTCString();
  header["Content-Transfer-Encoding"] = "binary";
  header["Content-Length"] = info.length;
  header.Server = "NodeMinder.js/0.0.5";

  res.writeHead(code, header);
}
