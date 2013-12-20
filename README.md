![NodeMinder.js logo](http://2.bp.blogspot.com/-yLlUNGSrJ5I/UUNr-qIoaeI/AAAAAAAAAEY/J13b7sezCzg/s1600/banner03.jpg)

###Warning
    
    This project is temporarily suspended and hope I can resume it soon.

    I think the next implementations should be:

    - Webcam support
    - Client to perform remote recordings

    The branch 0.1.0 has a newer and more complete version than the master branch.


# NodeMinder.js

Linux video camera security and surveillance solution based on ZoneMinder and developed on top of a node.js stack.

The system still doesn't have support for webcams and IP cameras. We plan to implement these features in future releases.

See some [screenshots](http://nodeminderjs.blogspot.com/) in our blog.

Contact: nodeminderjs@gmail.com

This is yet an early release without any configuration screen.
All settings must be made ​​directly in the json configuration file described below.

I am developing the system using a Linux server with the following configuration:

* CPU AMD FX-6100 Black Edition six-core
* 8G RAM - 2 x 4G (1333)
* HD Samsung 1T 103SJ Sata II, 7200 rpm
* Geovision GV-800 Video Capture Card ( 
[portuguese](http://www.geovision.com.tw/PT/Prod_GV800.asp) |
[spanish](http://www.geovision.com.tw/SP/Prod_GV800.asp) |
[install pdf](http://www.geovision.com.tw/Install_Products/GV-650800A.pdf) )
* Ubuntu Server 12.04.1 LTS

I am using an old Windows XP (argh!) desktop (AMD Athlon 64 X2 4000+ / 4 GB DDR2) to run the
client: Google Chrome browser version 25.0.1364.97 m. 

## Contents

* [Special features](#special-features)
* [Requirements](#requirements)
* [Release 0.0.9](#release-009)
* [Setup](#setup)
* [Configuration](#configuration)
* [Running the server](#running-the-server)
* [Open in your browser](#open-in-your-browser)


## Special features

* The client is a browser. No need to install any additional software on the client.
* You can fully customize the cameras display screen. You can move and resize the cameras
images, bring them to front or send to back. We can have several different custom screens.
* In the next release, it will be possible to add cameras from different servers on the
same screen.


## Requirements

* The system is designed to use modern hardware.


## Release 0.0.9

### Release notes

* Refactored the event recording routine to use /dev/shm buffers to store the frames used to
create the video.
* Refactored grabc to use mmap instead read capture method.
* Added continuous recording mode.
* Configured a delay to start each device grab process.
* Added '-preset veryfast' parameter to create video ffmpeg command.
* New /scripts folder to store some usefull scripts.
* New /app/scripts folder to store some shell scripts used by the system.
* New client features: snap, keyboard keys to move and resize cameras, context menu,
main manu and more.
* Moved the saved client grid configurations from the client to the server.
* Cameras thumbnails.
* New main page with thumbnails and more links.
* New configuration parameters.
* New cameras parameters: rec_fps and remote_fps.
* Adjust the cameras fps rate relative to the real device fps rate.

## Setup

### 1) Compile the c source code

It uses avcodec and swscale libraries from the FFmpeg project. 

I followed the excelent [Compile FFmpeg on Ubuntu]
(https://ffmpeg.org/trac/ffmpeg/wiki/UbuntuCompilationGuide) tutorial to provide
the latestFFmpeg code and enable several external encoding and decoding libraries,
like libx264 (H.264 encoder) used to encode the mp4 event recording video file. 

After getting ffmpeg, compile the c source code:

```
$ cd app/grabc/  
$ make  
$ cd ..
```

### 2) Install dependencies with npm

It uses [socket.io](http://socket.io/) and [express](http://expressjs.com/), so install them with npm.

```
$ cd app/ 
$ npm install  
```


## Configuration

Edit the configuration file [_nodeminderjs.conf_](https://github.com/nodeminderjs/NodeMinder.js/blob/master/app/config/nodeminderjs.conf) located at the _app/config_ folder to edit the server and cameras configuration options. This is a JSON formatted file containing the server port and cameras configuration options.

Example:

```javascript
{
    "server": {
        "port": 8080,
        "name": "01"
    },
    "other_servers": [
        {
            "url": "http://192.168.1.181:4040/",
            "name": "02"
        }
    ],
    "events": {
        "dir": "/var/nodeminderjs/events/"
    },
    "custom": {
        "dir":  "/var/nodeminderjs/custom/",
        "grid": "/var/nodeminderjs/custom/grid/"
    },
    "devices": {
        "captures_per_frame": 2,
        "buffers_per_input": 4
    },
    "cameras": {
        "01": {
            "descr": "IT camera 1",
            "type": "local",
            "device": "/dev/video0",
            "channel": 0,
            "format": "NTSC",
            "palette": "BGR24",
            "width": 320,
            "height": 240,
            "fps": 4,
            "remote_fps": 1,
            "recording": {
                "rec_on": 0,
                "rec_fps": 2,
                "change_detect": {
                    "pixel_limit": 10,  
                    "image_limit": 4
                }
            }
        },
        "02": {
            "descr": "Camera 2",
            "type": "local",
            "device": "/dev/video1",
            "channel": 0,
            "format": "NTSC",
            "palette": "BGR24",
            "width": 320,
            "height": 240,
            "fps": 1.5,
            "remote_fps": 1,
            "recording": {
                "rec_on": 1,
                "rec_fps": 1,
                "change_detect": {
                    "pixel_limit": 10,  
                    "image_limit": 6
                }
            }
        },
        
        ...
        
        "16": {
            "descr": "Camera 16",
            "type": "local",
            "device": "/dev/video3",
            "channel": 3,
            "format": "NTSC",
            "palette": "BGR24",
            "width": 320,
            "height": 240,
            "fps": 4,
            "remote_fps": 1,
            "recording": {
                "rec_on": 0,
                "rec_fps": 2,
                "change_detect": {
                    "pixel_limit": -1,
                    "image_limit": -1
                }
            }
        }        
    }
}
```

### server

This server's port and name.

### other_servers

List other server's info here.

### events

#### dir

Location of the mp4 videos generates for each event recording. The user wich is running
the node app must have write permissions in this dir.

Inside this dir will be created a structure like this:

One folder for each camera configured (Ex.: "01", "02", etc).
Inside each camera dir will be created one folder for each date
(Ex.: "2013-01-28", "2013-01-29", etc).
Inside each date folder will be placed the video files named with the event starting time
(Ex.: "170618.mp4", "210532.mp4", etc). 

### cameras

Each camera have to be an identifier, a number with a leading zero: "01", "02", etc.

For each camera you can configure the following options.

#### format

NTSC (default) | PAL_M

#### palette

palette = BGR24 (default) | BGR32 | RGB24 | RGB32 | YUYV | YUV420 | GREY

#### recording

##### rec_on

Turn on or off the camera events recording.

* 0 - off
* 1 - record on change detect
* 2 - continuous recording

##### change_detect

###### pixel_limit 

Upper diff limit (%) on pixel level to detect change.
Put higher values to decrease sensitivity, for example, for cameras with a higher
level of noise and interference in the image.

Use -1 value to disable change detection for this camera.

###### image_limit

Upper diff limit (%) on image level to detect change.
Lower values will get small changes in the image. Use higher values to decrease
sensitivity and detect only larger changes in the image.

Use -1 value to disable change detection for this camera.

Experiment with different values for these two parameters


## Running the server

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

We provide two scripts in the /scripts folder to start and stop the app
using [forever](https://github.com/nodejitsu/forever).


## Open in your browser

Open your browser at http://host:port (replace with your correct server ip/host and port).
Example: http://192.168.1.181:8080/.

We recomend Google Chrome browser. In Firefox we verified some image blinking.
In Chrome the image updating is more smooth.

### Configuring Google Chrome

To open Chrome in a separate instance and in full screen:

Windows example:

```
"C:\...\chrome.exe" --user-dat-dir="C:\path\to\user\data\dir" --kiosk http://url.to.open
```

Replace "C:\path\to\user\data\dir" whith a unique dir path for each instance.


### Home/config page

Ex.: http://192.168.1.181:8080/

Show a table with the configured cameras. In next releases this will be the configuration
page where we can configure and add cameras, set server and events global configs, etc.


### Grid page

Ex.: http://192.168.1.181:8080/grid/<custom_layout>

This page show all cameras in a grid style.

You can move and resize each camera. When you close and reopen, your last layout will
be reloaded.

Use a <custom_layout> name after the URL to save several different layouts.

Ex.:

http://192.168.1.181:8080/grid

will be diffent from

http://192.168.1.181:8080/grid/mygrid

each one with a different custom layout!

Keyboard shortcuts:

CTRL+M - show main menu

* Use Unlock option to enable screen customizations.
* Use Lock option to disable screen customizations.
* Use Save config option to save the screen customizations.

With the screen unlocked you can

* Click over a camera image to select then.

* Drag the camera image to a new position. The camera image snaps on another one that is near.
* Use CTRL+<arrow> to smoothly move the camera image.

* Resize the camera image using the mouse. Drag the slider that is on the bottom right.
* Use SHIFT+<arrow> to smoothly resize the camera image. 

* Click over a camera with the right mouse button to open a context menu.
Here you can bring to front or send to back the camera image.


### View page

Ex.: http://192.168.1.181:8080/view/<camera>

Show only one camera view.

Ex.: http://192.168.1.181:8080/view/1  <== show camera "01"


### Events page

Page for viewing the recorded events.

http://host:port/events/<camera>

Ex.: http://192.168.1.181:8080/events/4  <== show recorded events from camera "04"
