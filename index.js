"use strict"

var path = require('path')
var cp = require('child_process')
var exec = cp.exec
var spawn = cp.spawn

var fs = require('fs-extra')
var remove = fs.remove
var du = require('du')

var parse = require('mdconf');
var minimatch = require("minimatch")

var async = require('async')
var through = require('through')
var concat = require('concat-stream')
var split = require('split')

var debug = require('debug')
var info = debug('cruft')
var log = debug('cruft debug')
var merge = require('util')._extend

module.exports = function(dir, cruftFile, fn) {
  // cruftFile is optional
  if (typeof cruftFile === 'function') {
    fn = cruftFile
    cruftFile = null
  }
  module.exports.load(cruftFile, function(err, cruft) {
    if (err) return fn(err)
    log('loaded cruft file')
    module.exports.clear(dir, cruft, fn)
  })
}

module.exports.clear = function(dir, filter, fn) {
  var beforeSize = 0
  du(dir, function(err, size) {
    if (err) return fn(err)
    log('calculated size before', size)
    beforeSize = size
    findPackages(dir, function(err, installed) {
      if (err) return fn(err)
      log('found %d packages', installed.length)
      findCruft(installed, filter, function(err, files) {
        if (err) return fn(err)
        log('found %d pieces of cruft', files.length)
        async.map(files, function(file, done) {
          log('removing %s.', file)
          remove(file, function(err) {
            if (err) return done(err)
            done(null, file)
          })
        }, function(err, files) {
          if (err) return fn(err)
          du(dir, function(err, size) {
            if (err) return fn(err)
            log('calculated size after', size)
            fn(null, {
              before: beforeSize,
              after: size,
              files: files
            })
          }) 
        })
      })
    })
  })
}


module.exports.load = function(file, fn) {
  if (typeof file === 'function') {
    fn = file
    file = null
  }
  file = file || __dirname + '/Readme.md'
  fs.readFile(file, 'utf-8', function(err, fileContent) {
    if (err) return fn(err)
    var info = parse(fileContent)
    log('read cruft file', file)
    info['cruft found'].__defaults = info.cruft['default cruft'] || []
    fn(null, info['cruft found'])
  })
}

function findCruft(packages, filter, fn) {
  async.map(packages, function(pkg, done) {
    var name = pkg.name
    var patterns = filter[name] || []
    patterns = patterns.concat(filter.__defaults)
    patterns.forEach(function(pattern) {
      if (pattern[0] === '!') {
        patterns.splice(patterns.indexOf(pattern.slice(1)), 1)
        patterns.splice(patterns.indexOf(pattern), 1)
      }
    })
    log('cruft to remove from %s', name, patterns.join(', '))
    getFilesIn(pkg.realPath).pipe(split()).pipe(through(function(file) {
      if (!file) return
      var doesMatch = patterns.some(function(pattern) {
        return minimatch(path.relative(pkg.realPath, file), pattern)
      })
      if (doesMatch) {
        this.push([file])
      }
    })).pipe(concat(function(files) {
      files = files || []
      done(null, files.filter(function(file) {
        return file
      }))
    }))
  }, function(err, files) {
    files = files.filter(function(file) {
      return file
    })
    if(err) return fn(err)
    return fn(null, files.reduce(function(a, b) {
      return a.concat(b)
    }, []))
  })
}

function findPackages(dir, fn) {
  // ensure package.json exists, lest it accidentally delete
  // something.
  fs.exists(dir + '/package.json', function(exists) {
    if (!exists) return fn(new Error('package.json required in ' + dir))
    // NOTE RE --depth=10 
    // npm complains about
    // max-depth during test suite invoked
    // with `npm test`. this is a workaround.
    exec(__dirname + '/node_modules/.bin/npm la --json --depth=10', {
      cwd: dir,
      maxBuffer: 1000 * 1024
    }, function(err, stdout) {
      if (err) return fn(err)
      fn(null, getDependencies(JSON.parse(stdout)))
    })
  })
}

function getDependencies(root) {
  var results = []
  function next(pkg) {
    if (!pkg || !pkg.name) return
    for(var name in pkg.dependencies) {
      next(pkg.dependencies[name])
    }
    if (pkg === root) return
    results.push(pkg)
  }
  next(root)
  return results
}

function removeDuplicates(packages) {
  var paths = {}
  return packages.filter(function(pkg) {
    if (paths[pkg.realPath]) return false
    paths[pkg.realPath] = true
    return true
  })
}

function getFilesIn(dir, fn) {
  var find = spawn('find', [dir])
  find.stdout.setEncoding('utf8')
  return find.stdout
}
