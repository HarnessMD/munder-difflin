#!/bin/sh
# Build the md-hotkey helper (Carbon hot key, microphone, pasteboard paste)
# as ONE universal binary at resources/transcribe/darwin-universal/md-hotkey.
# Needs Xcode. Run from the repo root on a Mac: sh tools/build-md-hotkey.sh
set -eu
cd "$(dirname "$0")/.."
SRC=tools/md-hotkey/main.swift
OUT=resources/transcribe/darwin-universal
TMP="${TMPDIR:-/tmp}/md-hotkey-build.$$"
mkdir -p "$OUT" "$TMP"
for pair in "arm64 arm64-apple-macos13.0" "x64 x86_64-apple-macos13.0"; do
  set -- $pair
  echo "compiling for $2"
  xcrun swiftc -O -swift-version 5 -target "$2" -o "$TMP/md-hotkey-$1" "$SRC"
done
lipo -create "$TMP/md-hotkey-arm64" "$TMP/md-hotkey-x64" -output "$OUT/md-hotkey"
strip -x "$OUT/md-hotkey" 2>/dev/null || true
rm -rf "$TMP"
ls -la "$OUT/md-hotkey"
lipo -info "$OUT/md-hotkey"
