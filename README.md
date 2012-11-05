NodeMinder.js
=============

Linux video camera security and surveillance solution based on ZoneMinder and developed on top of a node.js stack.

Release Notes
-------------

This first release is a concept proof to test some design and tools options.

No configuration yet, and everything is hard coded.

I'm developing this on an Ubuntu 12.04 64 bits server with a GV-800 card with an attached cheap mini-camera. The camera options are hard-coded and are the following:

    device: /dev/video0
    video format: NTSC
    video resolution: 320x240
    frame rate: 3 fps

Nothing is optimized and I'm not a Javascript, Node.js or C++ experienced programmer. Neither I have much knowledge about V4L programming. So, how I have already said, this is only a initial concept proof to try to learn the basic concepts behind a complex software like ZoneMinder and try to do something less complex, using other concepts and technologies.

Setup
-----

1) Compile the c++ source code:

    $ cd grabc  
    $ ./c  
    $ cd ..

2) Modify the following line in index.html to match your server ip: 

    var socket = io.connect('http://192.168.1.181:8080/');

3) Run the app:

    $ sudo node app.js

  or add your user to video group with

    $ sudo adduser <your_user> video

  and run the app without sudo:

    $ node app.js

4) Open your browser in http://192.168.1.181:8080 (replace with your correct server ip/host).

Contact
-------

nodeminderjs@gmail.com
