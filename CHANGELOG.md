# Change Log

All notable changes to the "ProjCpp" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2021-04-19
### HOTFIX
- Allow migrating from old extension version to new one without breaking the compile command

## [1.2.0] - 2021-04-18
### Added
- The option to compile and run your code in an external cmd window rather than the on in VSCode (only cmd supported right now)
- Icon for the extension

### Fixed
- Specifying custom arguments to the compile-command now works correctly
- The project manager should work now on all platforms
- Support for other shells than cmd and powershell on windows
- Optimizations and improvements

## [1.1.1] - 2021-03-14
### Fixed
- Misjudging directories with '.' in them as files
- Play button not showing on light theme

## [1.1.0] - 2021-03-05
### Added
- Now it's possible to use arguments to compile command

### Fixed
- Recursive project paths
- Doesn't add the same path to environment variables twice

### Changed
- Searching in projects now searches in the project paths (case insensitive)

## [1.0.3] - 2021-03-02
### Added
- Pressing the run button will now save all open files

### Fixed
- Creating a new project didn't always create and open it

### Changed
- There's now a '!' symbol at the end of the sample program cout

## [1.0.2] - 2021-03-01
### Fixed
- "Run code" didn't work when there was no default shell set on windows

## [1.0.1] - 2021-02-28
### Fixed
- Half of compiled files didn't make it to the extension package

## [1.0.0] - 2021-02-28
### Added
- Project manager:
    - Sidebar
    - Detects folders with any files inside root project folder
    - Ability to create a project - this creates a folder (and/or subfolders) and adds a sample main.cpp file
### Fixed
- When using g++ or gcc the user always got a notification that it was found

## [0.0.1] - 2021-02-26
- Initial release

## [Unreleased]
