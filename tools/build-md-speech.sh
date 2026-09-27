#!/bin/sh
# Build the md-speech helper (Apple SpeechAnalyzer, macOS 26) as ONE universal
# binary, the same shape as md-whisper, and put it where electron-builder
# picks it up: resources/transcribe/darwin-universal/md-speech
# Needs Xcode with the macOS 26 SDK. Run from the repo root on a Mac:
#   sh tools/build-md-speech.sh
set -eu
cd "$(dirname "$0")/.."
SRC=tools/md-speech/main.swift
OUT=resources/transcribe/darwin-universal
TMP="${TMPDIR:-/tmp}/md-speech-build.$$"
mkdir -p "$OUT" "$TMP"
for pair in "arm64 arm64-apple-macos26.0" "x64 x86_64-apple-macos26.0"; do
  set -- $pair
  echo "compiling for $2"
  xcrun swiftc -O -swift-version 5 -target "$2" -o "$TMP/md-speech-$1" "$SRC"
done
lipo -create "$TMP/md-speech-arm64" "$TMP/md-speech-x64" -output "$OUT/md-speech"
strip -x "$OUT/md-speech" 2>/dev/null || true
rm -rf "$TMP"
ls -la "$OUT/md-speech"
lipo -info "$OUT/md-speech"
