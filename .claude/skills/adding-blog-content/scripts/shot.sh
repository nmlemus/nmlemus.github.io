#!/bin/zsh
# usage: shot.sh URL OUT [WIDTH] [HEIGHT] [extra chrome flags...]   (write OUT outside the repo)
C="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"  # set CHROME off macOS
URL=$1; OUT=$2; W=${3:-1280}; H=${4:-800}; shift 4 2>/dev/null
rm -f $OUT
"$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=/tmp/claude-shot-prof --window-size=$W,$H --virtual-time-budget=2500 --screenshot=$OUT "$@" "$URL" >/dev/null 2>&1 &
P=$!; for i in {1..40}; do [[ -f $OUT ]] && break; sleep 0.5; done; sleep 0.5; kill $P 2>/dev/null; ls $OUT >/dev/null
