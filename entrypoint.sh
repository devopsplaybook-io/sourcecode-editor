#!/bin/sh

if [ "${APPLICATION_TITLE}" == "" ]; then
  APPLICATION_TITLE="Code"
fi

sed -i "s/APPLICATION_TITLE/$APPLICATION_TITLE/g" /opt/app/sourcecode-editor/web/manifest.webmanifest

node dist/App.js