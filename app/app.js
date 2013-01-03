// Copyright NodeMinder.js
//
var server = require("./server");
var router = require("./router");
//var grab   = require("./grab");
var grab   = require("./grabcc");
var config = require("./config");

config.loadConfig();

server.start(router.route, grab.grabFrame);
