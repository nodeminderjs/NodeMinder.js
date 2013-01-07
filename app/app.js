// Copyright NodeMinder.js
//
var server = require("./server");
var router = require("./router");
var grab   = require("./grab");   // use c code to grab frames
var config = require("./config");

config.loadConfig();

server.start(router.route, grab.grabFrame);
