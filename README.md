NodeMinder.js
=============

Linux video camera security and surveillance solution based on ZoneMinder and developed on top of a node.js stack.

See some [screenshots in our blog](http://nodeminderjs.blogspot.com/).

Release 0.0.3
-------------

In this third release, the project is becoming more functional and stable.

We already have a configuration file with server and cameras configuration options. See the [wiki configuration page](https://github.com/nodeminderjs/NodeMinder.js/wiki/Configuration).

I'm developing this on an Ubuntu 12.04 64 bits server with a Geovision GV-800 card with two attached cheap generic mini-cameras. The cameras options are the following:

```
Camera 01
device: /dev/video0
video format: NTSC
video resolution: 320x240
frame rate: 3 fps

Camera 02
device: /dev/video1
video format: NTSC
video resolution: 320x240
frame rate: 3 fps
```

Setup
-----

### 1) Compile the c source code

It uses avcodec and swscale libraries from the FFmpeg project. 

```
$ cd app/grabc/  
$ make  
$ cd ..
```
    
### 2) Install dependencies with npm

It uses socket.io and express, so install them with npm.

```
$ cd app/ 
$ npm install  
```

### 3) Configuration

See the [wiki configuration page](https://github.com/nodeminderjs/NodeMinder.js/wiki/Configuration).

### 4) Run the app

```
$ sudo node app
```

or add your user to video group with

```
$ sudo adduser <your_user> video
```

and run the app without sudo

```
$ node app
```

### 5) Open in the browser

Open your browser in http://192.168.1.181:8080 (replace with your correct server ip/host and port).

Contact
-------

nodeminderjs@gmail.com
