cmake_minimum_required(VERSION 3.20)
project(CppUTGeneratedTests LANGUAGES C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# On Windows + clang-cl, CMake may fail with CMAKE_LINKER-NOTFOUND
# if the developer environment is not initialized correctly.
if(WIN32 AND CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
  if(NOT CMAKE_LINKER)
    find_program(CPPUT_CLANG_LINKER NAMES lld-link link)
    if(CPPUT_CLANG_LINKER)
      set(CMAKE_LINKER "${CPPUT_CLANG_LINKER}" CACHE FILEPATH "Linker used by clang-cl" FORCE)
    else()
      message(FATAL_ERROR "clang-cl detected but no linker found (lld-link/link). Please run in a Developer Command Prompt or make sure Visual Studio Build Tools are installed and on PATH.")
    endif()
  endif()
endif()

include(CTest)
enable_testing()

find_package(GTest REQUIRED)
include(GoogleTest)

# CppUT 会在保存测试文件后自动追加如下块：
# add_executable(<auto_target> <generated_test.cpp>)
# target_link_libraries(<auto_target> PRIVATE GTest::gtest_main)
# gtest_discover_tests(<auto_target>)
