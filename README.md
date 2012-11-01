NodeMinder.js
=============

Linux video camera security and surveillance solution based on ZoneMinder and developed on top of a node.js stack.

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

4) Open your browser in http://192.168.1.181:8080 (replace with your correct server ip/host).

Contact
-------

nodeminderjs@gmail.com
