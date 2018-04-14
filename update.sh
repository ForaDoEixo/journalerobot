#!/bin/sh
branch=`git branch | grep '*' | awk '{print $2}'`

git remote update
updated=`git log ${branch}...origin/${branch} | grep commit`

if (updated); then
        git pull --rebase
        yarn
fi

yarn build

if (updated); then
        start-stop-daemon --stop --pidfile PID
        start-stop-daemon --start -b -m --pidfile PID -d `realpath .` --exec /usr/bin/node index.js
fi

