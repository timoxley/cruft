"use strict"

var fs = require('fs-extra')
var path = require('path')
var cp = require('child_process')
var exec = cp.exec
var spawn = cp.spawn

var async = require('async')

var minimatch = require("minimatch")
var concat = require('concat-stream')
var parse = require('mdconf');

var debug = require('debug')
var info = debug('cruft')
var log = debug('cruft debug')

var extend = require('util')._extend
var du = require('du')

module.exports.Purge = Purge

function Purge() {
  
}


Purge.packages = function packages(dir, fn) {
  //// ensure package.json exists, lest it accidentally delete
  //// something by reading package.json in parent dir.
  var pkginfo = undefined
  var err = undefined
  fs.exists(dir + '/package.json', function(exists) {
    if (!exists) return fn(new Error('package.json required in ' + dir))
    // NOTE RE --depth=10 
    // npm complains about
    // max-depth during test suite invoked
    // with `npm test`. this is a workaround.
    var la = spawn(__dirname + '/node_modules/.bin/npm', 'la --json --depth=10'.split(' '), {
      cwd: dir,
      stdio: 'pipe'
    })
    la.stdout.pipe(concat(function(data) {
      pkginfo = data
    }))
    la.stderr.pipe(concat(function(data) {
      err = data
    }))
    la.on('close', function(code) {
      if (code !== 0) return fn(new Error(err))
      fn(null, pkginfo) 
    })
  })
}

Purge.flattenDependencies = function flattenDependencies(root) {
  var results = []
  function next(pkg) {
    if (!pkg || !pkg.name) return
    for(var name in pkg.dependencies) {
      next(pkg.dependencies[name])
    }
    if (pkg !== root) results.push(pkg)
  }
  next(root)
  return results
}

Purge.filter = function filter(root, input, filter, fn) {
  fn(null, input.filter(function(file) {
    return filter.some(function(pattern) {
      return minimatch(path.relative(root, file), pattern)
    })
  }))
}

Purge.remove = function filter(files, fn) {
  async.map(files, function(file, done) {
    fs.remove(file, function(err) {
      if (err) return done(err)
      done(null, file)
    })
  }, fn)
}

Purge.usage = function(dir, fn) {
  return du(dir, fn)
}

Purge.loadPatterns = function(file, fn) {
  fs.readFile(file, 'utf-8', function(err, fileContent) {
    if (err) return fn(err)
    var info = parse(fileContent)
    var defaults = info.purge['purge defaults']
    for (var key in info['purge list']) {
      info['purge list'][key] = info['purge list'][key].concat(defaults)
    }
    fn(null, info['purge list'])
  })
}

//var path = require('path')
//var cp = require('child_process')
//var exec = cp.exec
//var spawn = cp.spawn

//var fs = require('fs-extra')
//var du = require('du')

//var parse = require('mdconf');
//var minimatch = require("minimatch")

//var async = require('async')
//var through = require('through')
//var concat = require('concat-stream')
//var split = require('split')

//var debug = require('debug')
//var info = debug('cruft')
//var log = debug('cruft debug')
//var merge = require('util')._extend

//module.exports = function(dir, cruftFile, fn) {
  //// cruftFile is optional
  //if (typeof cruftFile === 'function') {
    //fn = cruftFile
    //cruftFile = null
  //}
  //module.exports.load(cruftFile, function(err, cruft) {
    //if (err) return fn(err)
    //log('loaded cruft file')
    //module.exports.clear(dir, cruft, fn)
  //})
//}

//module.exports.dry = function(dir, cruftFile, fn) {
    //// cruftFile is optional
  //if (typeof cruftFile === 'function') {
    //fn = cruftFile
    //cruftFile = null
  //}
  //module.exports.load(cruftFile, function(err, cruft) {
    //if (err) return fn(err)
    //log('loaded cruft file')
    //findTargets(dir, cruft, fn)
  //})
//}

//module.exports.clear = function(dir, filter, fn) {
  //if (fs.realpath(dir) === fs.realpath(__dirname + '/../')) {
    //throw new Error('refusing to clear own files.') 
  //}
  //var beforeSize = 0
  //du(dir, function(err, size) {
    //if (err) return fn(err)
    //log('calculated size before', size)
    //beforeSize = size
    //findTargets(dir, filter, function(err, files) {
      //if (err) return fn(err)
      //async.map(files, function(file, done) {
        //log('removing %s.', file)
        ////remove(file, function(err) {
          ////if (err) return done(err)
          //done(null, file)
        ////})
      //}, function(err, files) {
        //if (err) return fn(err)
        //du(dir, function(err, size) {
          //if (err) return fn(err)
          //log('calculated size after', size)
          //fn(null, {
            //before: beforeSize,
            //after: size,
            //files: files
          //})
        //})
      //})
    //})
  //})
//}

//function findTargets(dir, filter, fn) {
  //findPackages(dir, function(err, installed) {
    //if (err) return fn(err)
    //log('found %d packages', installed.length)
    //findCruft(installed, filter, function(err, files) {
      //if (err) return fn(err)
      //log('found %d pieces of cruft', files.length)
      //fn(null, files)
    //})
  //})
//}


//module.exports.load = function(file, fn) {
  //if (typeof file === 'function') {
    //fn = file
    //file = null
  //}
  //file = file || __dirname + '/Readme.md'
  //fs.readFile(file, 'utf-8', function(err, fileContent) {
    //if (err) return fn(err)
    //var info = parse(fileContent)
    //log('read cruft file', file)
    //info['cruft found'].__defaults = info.cruft['default cruft']
    //fn(null, info['cruft found'])
  //})
//}

//function findCruft(packages, filter, fn) {
  //async.map(packages, function(pkg, done) {
    //var name = pkg.name
    //var patterns = filter[name] || []
    //patterns = patterns.concat(filter.__defaults || [])
    //log('cruft to remove from %s', name, patterns.join(', '))
    //getFilesIn(pkg.realPath).pipe(split()).pipe(through(function(file) {
      //if (!file) return
      //var doesMatch = patterns.some(function(pattern) {
        //return minimatch(path.relative(pkg.realPath, file), pattern)
      //})
      //if (doesMatch) {
        //this.push([file])
      //}
    //})).pipe(concat(function(files) {
      //files = files || []
      //done(null, files.filter(function(file) {
        //return file
      //}))
    //}))
  //}, function(err, files) {
    //files = files.filter(function(file) {
      //return file
    //})
    //if(err) return fn(err)
    //return fn(null, files.reduce(function(a, b) {
      //return a.concat(b)
    //}, []))
  //})
//}

//function findPackages(dir, fn) {
  //// ensure package.json exists, lest it accidentally delete
  //// something.
  //fs.exists(dir + '/package.json', function(exists) {
    //if (!exists) return fn(new Error('package.json required in ' + dir))
    //// NOTE RE --depth=10 
    //// npm complains about
    //// max-depth during test suite invoked
    //// with `npm test`. this is a workaround.
    //exec(__dirname + '/node_modules/.bin/npm la --json --depth=10', {
    ////exec('node -e "console.log(process.cwd())"', {
      //cwd: dir,
      //maxBuffer: 1000 * 1024
    //}, function(err, stdout) {
      //if (err) return fn(err)
      //fn(null, getDependencies(JSON.parse(stdout)))
    //})
  //})
//}

//function remove(file, fn) {
  //var ownDir = fs.realpath(__dirname + '/../')
  //if (new RegExp(ownDir).match(fs.realpath(file))
  //if (dry) fn(null, file)
  //return fs.remove(fn, fn)
//}

//function getDependencies(root) {
  //var results = []
  //function next(pkg) {
    //if (!pkg || !pkg.name) return
    //for(var name in pkg.dependencies) {
      //next(pkg.dependencies[name])
    //}
    //results.push(pkg)
  //}
  //next(root)
  //return results
//}

//function removeDuplicates(packages) {
  //var paths = {}
  //return packages.filter(function(pkg) {
    //if (paths[pkg.realPath]) return false
    //paths[pkg.realPath] = true
    //return true
  //})
//}

//function getFilesIn(dir, fn) {
  //var find = spawn('find', [dir])
  //find.stdout.setEncoding('utf8')
  //return find.stdout
//}
