# cruft

Package cruft removal.

This tries to remove files from codebases that are not required in production (e.g. docs, tests, examples). 

Primary use case is deploying on [devices](http://ninjablocks.com) that may not have a lot of disk space
or access to decent bandwidth (e.g. [Australia](http://www.netindex.com/download/2,18/Australia/)).

## Default Cruft

By default, the following content will be removed. This is potentially dangerous.


- example
- examples
- test
- tests
- doc
- man

Updates to this readme will change these defaults.

# Cruft Found

This is a list of npm packages and their cruft
if a package is found in this list when cruft is run,
any listed content will be removed. 

Entries starting with a bang will not be removed. e.g.
override defaults in the case they remove something they
should not.

Updates to this readme will change these values.

## hawk
  - images

## boom
  - images

## ansi
  - !examples
