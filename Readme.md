# cruft

<img src="https://f.cloud.github.com/assets/43438/1368434/161fab1a-39a0-11e3-9d4a-9dffc2746cf6.png" align="right">

Package cruft removal.

[![Build Status](https://travis-ci.org/timoxley/cruft.png?branch=master)](https://travis-ci.org/timoxley/cruft)

`cruft` tries to remove files from codebases that are not required in production such as documentation, tests and examples. 

The primary usecase is for deploying to devices with constrained diskspace (e.g. [NinjaBlocks](http://ninjablocks.com))
or bandwidth (e.g. [Australia](http://www.netindex.com/download/2,18/Australia/)).

## Usage

```
> cruft clear --help
  Usage: cruft-clear [options]

  Options:

    -h, --help         output usage information
    -V, --version      output the version number
    -f, --file [file]  markdown file containing cruft definitions
    -v, --verbose      verbose output
```

## Example Usage

```
> npm install -g cruft
> cd my-crufty-app
> cruft clear
  cruft before +0ms 82.11mb
  cruft after +15ms 31.46mb
  cruft 50.65mb of cruft cleared! +3ms
  cruft 61.68% reduction! +10ms
```

You'll be surprised how much cruft there is in your codebase. Try it and see!

## Specifying Cruft

`cruft` uses [dominictarr/rc](https://github.com/dominictarr/rc) for its configuration, so you can specify cruft in various ways,
including a config.json file specified by `--config`. See [dominictarr/rc](https://github.com/dominictarr/rc) for other ways to specify configuration. `cruft`'s app-name is 'cruft'.

```
> cat config.json # __defaults apply to every module
"cruft": {
  "__defaults": ["test", "examples"],
  "some-module": ["images"]
}
> cruft clear --config config.json
```

By default, this will add to the default cruft listed below. To turn off
the default cruft, use `--noDefaultCruft`:

```
# use cruft_cruft environment variable to specify a custom cruft pattern
# and --noDefaultCruft to disable default cruft patterns
> cruft_cruft="tests" cruft clear --noDefaultCruft
```

## Identifying Cruft

`cruft` uses [visionmedia/mdconf](https://github.com/visionmedia/mdconf) to get a list of default patterns to match straight from this readme.
If you find a package that has additional cruft, or mistakenly identified cruft, submit a pull request to update the list in this readme.

## Default Cruft

By default, the following content will be removed. This is potentially dangerous.

- example
- examples
- test
- tests
- doc
- man

# Cruft Found

This is a list of npm packages and their cruft.
If a package is found in this list when `cruft` is run,
any listed content will be removed. 

Entries starting with a bang will not be removed. e.g.
override defaults in the case they remove something they
should not.

## hawk
  - images

## boom
  - images

## ansi
  - !examples
