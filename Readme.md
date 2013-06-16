# purge

Package cruft removal.

## Purge Defaults

By default, the following content will be removed

- example
- examples
- test
- tests
- doc
- man

Updates to this readme will change these defaults.

# Purge List

This is a list of npm packages and their cruft
if a package is found in this list when cruft is run,
any listed content will be removed. 

To override defaults, add a bang (!) in front of the value
in the listing below.

Updates to this readme will change these values.

## hawk
  - images

## boom
  - images

## ansi
  - !examples
