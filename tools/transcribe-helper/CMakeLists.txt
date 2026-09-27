# md-whisper, the resident local transcription helper. Built by
# tools/build-transcribe-helpers.mjs, which checks out whisper.cpp at the pinned
# commit and passes it in as WHISPER_CPP_DIR. Static: one file, no dylib beside it.
cmake_minimum_required(VERSION 3.21)
project(md-whisper CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if (NOT DEFINED WHISPER_CPP_DIR)
    message(FATAL_ERROR "pass -DWHISPER_CPP_DIR=<whisper.cpp checkout>")
endif()
# A Windows path (D:\a\...) would be read as escapes ("\a") once it is put
# inside a quoted list below; CMake's own form uses forward slashes.
file(TO_CMAKE_PATH "${WHISPER_CPP_DIR}" WHISPER_CPP_DIR)
if (NOT DEFINED MD_WHISPER_COMMIT)
    set(MD_WHISPER_COMMIT "unknown")
endif()

set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_SERVER OFF CACHE BOOL "" FORCE)
add_subdirectory(${WHISPER_CPP_DIR} whisper-cpp EXCLUDE_FROM_ALL)

# The audio reader from whisper's examples (wav, mp3, flac, ogg through miniaudio,
# resampled to 16 kHz), compiled in directly so the rest of the examples are not built.
add_executable(md-whisper
    md-whisper.cpp
    ${WHISPER_CPP_DIR}/examples/common-whisper.cpp
)
target_include_directories(md-whisper PRIVATE
    ${WHISPER_CPP_DIR}/include
    ${WHISPER_CPP_DIR}/ggml/include
    ${WHISPER_CPP_DIR}/examples
)
if (NOT DEFINED MD_WHISPER_VERSION)
    set(MD_WHISPER_VERSION "0.1.0")
endif()
target_compile_definitions(md-whisper PRIVATE MD_WHISPER_COMMIT="${MD_WHISPER_COMMIT}" MD_WHISPER_VERSION="${MD_WHISPER_VERSION}")
target_link_libraries(md-whisper PRIVATE whisper ${CMAKE_THREAD_LIBS_INIT})
if (NOT MSVC)
    target_compile_options(md-whisper PRIVATE -Wall -Wextra)
endif()
