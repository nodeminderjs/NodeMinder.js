# NodeMinder.js

Linux video camera security and surveillance solution based on ZoneMinder and developed on top of a node.js stack.

See some [screenshots in our blog](http://nodeminderjs.blogspot.com/).

Contact: nodeminderjs@gmail.com

## Contents

* Release 0.0.4
* Setup
* Configuration
* Running the server
* User manual

## Release 0.0.4

### Release notes

* Fixed the problem with multichannel cards.
Reads from multiple cameras connected to the same chip (device - e.g. /dev/video0) are now synchronous.
* Implemented a simple image change detection routine to trigger recording.
* Improvements in the client (browser) to allow positioning and resizing of the cameras images,
selection of cameras that will be shown on the view and saving these customizations.



## Setup

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

