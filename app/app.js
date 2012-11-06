// Copyright NodeMinder.js
//
var server = require("./server");
var grab   = require("./grab");
var config = require("./config");

config.loadConfig();

server.start(grab.grabFrame);
