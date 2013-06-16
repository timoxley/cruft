"use strict"

var test = require('tape')
var Purge = require('../').Purge
var fs = require('fs-extra')

test('removing files', function(t) {
  t.plan(5)
  
  var files = [
    __dirname + '/tmp/node_modules/hawk/',
    __dirname + '/tmp/node_modules/shoe/'
  ]
  fs.remove(__dirname + '/tmp', function(err) {
    if (err) return console.error('error', err)
    fs.copy(__dirname + '/fixtures', __dirname + '/tmp', function(err) {
      if (err) return console.error('error', err)
      var root = __dirname + '/tmp'
      
      Purge.remove(files, function(err, result) {
        t.ifError(err)
        t.ok(!fs.existsSync(__dirname + '/tmp/node_modules/hawk'), 'removes hawk')
        t.ok(!fs.existsSync(__dirname + '/tmp/node_modules/shoe'), 'removes shoe')
        t.ok(fs.existsSync(__dirname + '/tmp/node_modules/npm'), 'does not remove npm')
        t.end()
      })
    })
  })
})


