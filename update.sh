#!/bin/sh
branch=`git branch | grep '*' | awk '{print $2}'`
git remote update
if (git log ${branch}...origin/${branch} | grep commit); then
        pid=`cat PIDFILE`
        git pull --rebase
        yarn
        yarn build
        start-stop-daemon --stop --pidfile PID
        start-stop-daemon --start -b -m --pidfile PID -d `realpath .` --exec /usr/bin/node index.js
fi

