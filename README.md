# NodeMinder.js

Linux video camera security and surveillance solution based on ZoneMinder and developed on top of a node.js stack.

See some [screenshots in our blog](http://nodeminderjs.blogspot.com/).

Contact: nodeminderjs@gmail.com


## Contents

* Release 0.0.5
* Setup
* Configuration
* Running the server
* Open in your browser


## Release 0.0.5

### Release notes

* New page for viewing the recorded events.
* Fixed bug with event mp4 video generated. Added "-pix_fmt yuv420p" output parameter
to the ffmpeg command. Now the generated video plays in Google Chrome browse. 


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


## Configuration

Edit the configuration file [_nodeminderjs.conf_](https://github.com/nodeminderjs/NodeMinder.js/blob/master/app/config/nodeminderjs.conf) located at the _app/config_ folder to edit the server and cameras configuration options. This is a JSON formatted file containing the server port and cameras configuration options.

Example with two cameras configured:

```javascript
{
    "server": {
        "port": 8080
    },
    "events": {
        "dir": "/var/nodeminderjs/events/"
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
            "fps": 3,
            "recording": {
                "rec_on": 0,
                "change_detect": {
                    "pixel_limit": 9,  
                    "image_limit": 5
                }
            }
        },
        "02": {
            "descr": "IT camera 2",
            "type": "local",
            "device": "/dev/video1",
            "channel": 0,
            "format": "NTSC",
            "palette": "BGR24",
            "width": 320,
            "height": 240,
            "fps": 3,
            "recording": {
                "rec_on": 0,
                "change_detect": {
                    "pixel_limit": 6,
                    "image_limit": 2
                }
            }
        },
        "03": {
            "descr": "IT camera 3",
            "type": "local",
            "device": "/dev/video2",
            "channel": 0,
            "format": "NTSC",
            "palette": "BGR24",
            "width": 320,
            "height": 240,
            "fps": 3,
            "recording": {
                "rec_on": 0,
                "change_detect": {
                    "pixel_limit": 6,
                    "image_limit": 2
                }
            }
        },
        "04": {
            "descr": "front door",
            "type": "local",
            "device": "/dev/video3",
            "channel": 0,
            "format": "NTSC",
            "palette": "BGR24",
            "width": 320,
            "height": 240,
            "fps": 3,
            "recording": {
                "rec_on": 1,
                "change_detect": {
                    "pixel_limit": 6,
                    "image_limit": 2
                }
            }
        },
        "05": {
            "descr": "my table",
            "type": "local",
            "device": "/dev/video0",
            "channel": 1,
            "format": "NTSC",
            "palette": "BGR24",
            "width": 320,
            "height": 240,
            "fps": 3,
            "recording": {
                "rec_on": 1,
                "change_detect": {
                    "pixel_limit": 7,
                    "image_limit": 3
                }
            }
        }
    }
}
```

### events >> dir

Location of the mp4 videos generates for each event recording. The user wich is running
the node app must have write permissions in this dir.

Inside this dir will be created a structure like this:

One folder for each camera configured (Ex.: "01", "02", etc). Inside each camera dir will be created
one folder for each date (Ex.: "2013-01-28", "2013-01-29", etc). Inside each date folder will be placed
the video files named with the event starting time (Ex.: "170618.mp4", "210532.mp4", etc). 

### cameras >> NN >> format

NN = camera number with a leading zero: "01", "02", etc.

format = NTSC (default) | PAL_M

### cameras >> NN >> palette

palette = BGR24 (default) | BGR32 | RGB24 | RGB32 | YUYV | YUV420 | GREY

### cameras >> NN >> recording >> rec_on

Turn on (1) or off (0) the events recording for the camera.

### cameras >> NN >> recording >> change_detect >> pixel_limit 

Upper diff limit (%) on pixel level to detect change.
Put higher values to decrease sensitivity, for example, for cameras with a higher
level of noise and interference in the image.

Use -1 value to disable change detection and recording for this camera.

### cameras >> NN >> recording >> change_detect >> image_limit

Upper diff limit (%) on image level to detect change.
Lower values will get small changes in the image. Use higher values to decrease
sensitivity and detect only larger changes in the image.

Use -1 value to disable change detection and recording for this camera.

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


## Open in your browser

Open your browser in http://host:port (replace with your correct server ip/host and port).

We recomend Google Chrome browser. In Firefox we verified some image blinking.
In Chrome the image changing is more smooth. 

Example:

http://192.168.1.181:8080/

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

http://192.168.1.181:8080/grid

that will be different from

http://192.168.1.181:8080/grid/mygrid

each one with a different custom layout!

### View page

Ex.: http://192.168.1.181:8080/view/<camera>

Show only one camera view.

Ex.: http://192.168.1.181:8080/view/1  <== show camera "01"

### Events page

Page for viewing the recorded events.

http://host:port/events/<camera>

Ex.: http://192.168.1.181:8080/events/4  <== show recorded events from camera "04"
