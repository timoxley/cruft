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
var bl = require('bl')

var debug = require('debug')
var info = debug('cruft')
var log = debug('cruft debug')
var silly = debug('cruft silly')
var merge = require('util')._extend

var NPM_PATH = __dirname + '/node_modules/.bin/npm'

module.exports = function(options, fn) {
  options = options || {}
  var cruft = options.cruft
  var dir = options.dir
  var dry = !!options.dry // default false

  module.exports.clear({
    dir: dir,
    filter: cruft,
    dry: dry
  }, fn)
}

module.exports.clear = function(options, fn) {
  options = options || {}
  var dir = options.dir
  var filter = options.filter
  var dry = !!options.dry || false
  var beforeSize = 0
  async.series([
    function(next) {
      calculateSize(dir, function(err, size) {
        beforeSize = size
        next(err, size)
      })
    },
    function(next) {
      if (dry) return next()
      prune(dir, next)
    },
    function(next) {
      if (dry) return next()
      dedupe(dir, next)
    },
    function(done) {
      findPackages(dir, function(err, installed) {
        if (err) return done(err)
        log('found %d packages', installed.length)
        findCruft(installed, filter, function(err, files) {
          if (err) return done(err)
          log('found %d pieces of cruft', files.length)
          if (dry) {
            return estimateSizes(files, function(err, estimatedSize) {
              done(err, {
                before: beforeSize,
                after: beforeSize - estimatedSize,
                files: files
              })
            })
            return
          }
          log('removing cruft')
          removeCruft(files, function(err) {
            log('removed cruft')
            if (err) return done(err)
            calculateSize(dir, function(err, afterSize) {
              done(err, {
                before: beforeSize,
                after: afterSize,
                files: files
              })
            })
          })
        })
      })
    }
  ], function(err, args) {
    fn(err, args[args.length - 1])
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

function calculateSize(dir, fn) {
  du(dir, fn)
}

function estimateSizes(files, fn) {
  async.reduce(files, 0, function(prev, file, next) {
    du(file, function(err, size) {
      if (err) return next(err)
      next(null, prev + size)
    })
  }, fn)
}

function removeCruft(files, fn) {
  async.mapLimit(files, 128, remove, fn)
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
    getFilesIn(pkg.realPath, function(err, files) {
      if (err) return done(err)
      files = files || []
      done(null, files.filter(function(file) {
        if (!file) return
        return patterns.some(function(pattern) {
          return minimatch(path.relative(pkg.realPath, file), pattern)
        })
      }))
    })
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
  var files = bl(function() {})
  var errs = bl(function() {})
  var find = spawn('find', [dir])
  find.stdout.setEncoding('utf8')
  find.stdout.pipe(files)
  find.stdout.pipe(errs)
  find.on('close', function(code) {
    if (code !== 0) return fn(new Error('non-zero exit for find: \n'  + errs.toString()))
    fn(null, files.toString().split('\n'))
  })
}

function execCmd(cmd, dir, fn) {
  var execCmd = cmd.split(' ')[0]
  var args = cmd.split(' ').slice(1)

  if (typeof dir === 'function') {
    fn = dir
    dir = process.cwd()
  }
  var child = spawn(execCmd, args, {
    cwd: dir,
    stdio: 'pipe'
  })

  var output = bl(function(){})
  var errs = bl(function(){})

  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.pipe(output)
  child.stderr.pipe(errs)
  child.on('close', function(code) {
    if (code !== 0) return fn(new Error(errs.toString()))
    silly('executed: %s: \nstdout: %s\n stderr: %s\n', cmd, output.toString().slice(0, 50), errs.toString())
    fn(null, output.toString(), errs.toString())
  })
}
