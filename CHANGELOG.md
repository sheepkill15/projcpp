# Change Log

All notable changes to the "ProjCpp" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2022-10-03
### Added
- Support for normal C
### Fixed
- Support for external terminal on linux

## [1.5.0] - 2021-06-15
### Added
- The command to create the header and/or implementation file of a class and struct of given name
    - Use 'projcpp.createItem' command for this

## [1.4.1] - 2021-06-12
### Fixed
- Linux support for both the runner and project manager
- Typo in previous changelog

## [1.4.0] - 2021-05-30
### Added
- 'ProjCpp: Open projects' now correctly opens the same view as the sidebar
- Progress when downloading / extracting the compiler

### Fixed
- Default value of 'Multiple folders' setting is now false
- When adding a new folder to the workspace, the explorer is focused
- When path has already been notified, the user is enforced to restart

### Changed
- Compile command now can't be a file, since this is unnecessary

## [1.3.3] - 2021-05-19
### Fixed
- Incorrectly cd'ing into directory without ""
- Trying to compile when OUTPUT panel is focused
- Not getting correct terminal name when it's created

## [1.3.0] - 2021-05-17
### Added
- The option to allow folders to be opened side-by-side in the workspace (and the editor not to be refreshed each time)
- Compilation errors now show inside Outputs -> ProjCpp for clarity, and program is only run if compilation is successful

### Fixed
- However you open whatever terminal, the commands are now passed correctly

### Bugs
- When an "Outputs" panel has focus, the code running doesn't work (receives wrong filepath) 

## [1.2.2] - 2021-04-19
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
