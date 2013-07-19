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
var silly = debug('cruft silly')
var merge = require('util')._extend

var NPM_PATH = __dirname + '/node_modules/.bin/npm'

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
    prune(dir, function(err) {
      if (err) return fn(err)
      dedupe(dir, function(err) {
      if (err) return fn(err)
        findPackages(dir, function(err, installed) {
        if (err) return fn(err)
          log('found %d packages', installed.length)
          findCruft(installed, filter, function(err, files) {
            if (err) return fn(err)
            log('found %d pieces of cruft', files.length)
            async.mapLimit(files, 128, function(file, done) {
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
  async.mapLimit(packages, 32, function(pkg, done) {
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

function prune(dir, fn) {
  execCmd(NPM_PATH + ' prune --depth=10', dir, function(err, stdout) {
    info('pruned')
    if (err) return fn(err)
    fn(null)
  })
}

function dedupe(dir, fn) {
  execCmd(NPM_PATH + ' dedupe --depth=10', dir, function(err, stdout, stderr) {
    info('deduped')
    if (err) return fn(err)
    fn(null)
  })
}

function findPackages(dir, fn) {
  //// ensure package.json exists, lest it accidentally delete
  //// something by reading package.json in parent dir.
  var pkgInfo = undefined
  var err = undefined
  fs.exists(dir + '/package.json', function(exists) {
    if (!exists) return fn(new Error('package.json required in ' + dir))
    // NOTE RE --depth=10 
    // npm complains about
    // max-depth during test suite invoked
    // with `npm test`. this is a workaround.
    execCmd(NPM_PATH + ' la --json --depth=10', dir, function(err, pkgInfo) {
      if (err) return fn(err)
      fn(null, getDependencies(JSON.parse(pkgInfo)))
    })
  })
}

function getDependencies(root) {
  var results = []
  function next(pkg) {
    if (!pkg || !pkg.name) return
    silly('getting deps for %s', pkg && pkg.name)
    for (var name in pkg.dependencies) {
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

function execCmd(cmd, dir, fn) {
  var execCmd = cmd.split(' ')[0]
  var args = cmd.split(' ').slice(1)
  var output = undefined
  var err = undefined

  if (typeof dir === 'function') {
    fn = dir
    dir = process.cwd()
  }
  var child = spawn(execCmd, args, {
    cwd: dir,
    stdio: 'pipe'
  })
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.pipe(concat(function(data) {
    output = data
  }))
  child.stderr.pipe(concat(function(data) {
    err = data
  }))
  child.on('close', function(code) {
    if (code !== 0) return fn(new Error(err))
    silly('executed: %s: \nstdout: %s\n stderr: %s\n', cmd, output.slice(0, 1000), err)
    fn(null, output, err)
  })
}
