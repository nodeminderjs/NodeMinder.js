// Copyright NodeMinder.js
//
var server = require("./server.js");
var grab   = require("./grab.js");

server.start(grab.grabFrame);
