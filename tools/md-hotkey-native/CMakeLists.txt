# md-hotkey for Windows and Linux (0.5.3, F16): the native half of "dictate
# into any app" off the Mac, one small C program per platform speaking the
# macOS helper's protocol (tools/md-hotkey/main.swift). Built by
# tools/build-transcribe-helpers.mjs beside md-whisper; macOS keeps its Swift
# helper (tools/build-md-hotkey.sh).
cmake_minimum_required(VERSION 3.16)
project(md-hotkey-native C)
set(CMAKE_C_STANDARD 11)

if(WIN32)
  add_executable(md-hotkey win.c)
  target_link_libraries(md-hotkey PRIVATE ole32 user32 advapi32 shell32)
  # One static binary: the CRT goes in, nothing to redistribute.
  set_property(TARGET md-hotkey PROPERTY MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
  target_compile_definitions(md-hotkey PRIVATE UNICODE _UNICODE)
elseif(UNIX AND NOT APPLE)
  find_package(PkgConfig REQUIRED)
  pkg_check_modules(X11 REQUIRED x11 xtst)
  pkg_check_modules(PULSE REQUIRED libpulse-simple)
  add_executable(md-hotkey linux.c)
  target_include_directories(md-hotkey PRIVATE ${X11_INCLUDE_DIRS} ${PULSE_INCLUDE_DIRS})
  target_link_libraries(md-hotkey PRIVATE ${X11_LIBRARIES} ${PULSE_LIBRARIES} pthread)
  target_compile_options(md-hotkey PRIVATE -Wall -Wextra -O2)
else()
  message(FATAL_ERROR "macOS builds md-hotkey from Swift: sh tools/build-md-hotkey.sh")
endif()
