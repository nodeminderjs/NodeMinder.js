#!/bin/bash
if [ $(/bin/ps -u $USER | /bin/grep node | /bin/grep nodeminderjs | /bin/grep -v grep | /usr/bin/wc -l | /usr/bin/tr -s "\n") -eq 0 ]
then
  export NODE_ENV=production
  export PATH=/usr/local/bin:$PATH
  cd /home/$USER/share/nodeminderjs/app
  /bin/forever start app.js > /dev/null
fi

