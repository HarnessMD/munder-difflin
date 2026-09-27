#!/bin/sh
# Build the md-tap helper (ScreenCaptureKit audio of the whole display, the
# other side of a call) as ONE universal binary at
# resources/transcribe/darwin-universal/md-tap. Needs Xcode with the macOS 13
# SDK or later. Run from the repo root on a Mac: sh tools/build-md-tap.sh
set -eu
cd "$(dirname "$0")/.."
SRC=tools/md-tap/main.swift
OUT=resources/transcribe/darwin-universal
TMP="${TMPDIR:-/tmp}/md-tap-build.$$"
mkdir -p "$OUT" "$TMP"
for pair in "arm64 arm64-apple-macos13.0" "x64 x86_64-apple-macos13.0"; do
  set -- $pair
  echo "compiling for $2"
  xcrun swiftc -O -swift-version 5 -target "$2" -o "$TMP/md-tap-$1" "$SRC"
done
lipo -create "$TMP/md-tap-arm64" "$TMP/md-tap-x64" -output "$OUT/md-tap"
strip -x "$OUT/md-tap" 2>/dev/null || true
rm -rf "$TMP"
ls -la "$OUT/md-tap"
lipo -info "$OUT/md-tap"
