// Copyright NodeMinder.js
//
var url = require("url");

function route(req, res) {
  var pathname = url.parse(req.url).pathname;  
  console.log("About to route a request for " + pathname);
}

exports.route = route;