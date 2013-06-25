"use strict"

var fs = require('fs-extra')
var Cruft = require('../index')
var test = require('tape')

test('it removes cruft', function(t) {
  t.plan(3)
  fs.remove(__dirname + '/tmp/', function(err) {
    if (err) return console.error('error', err)
    fs.copy(__dirname + '/fixtures/simple', __dirname + '/tmp', function(err) {
      if (err) return console.error('error', err)
      Cruft(__dirname + '/tmp', __dirname + '/../Readme.md', function(err, stats) {
        t.ifError(err, 'no error')
        t.assert(stats.after < stats.before, 'reduces total size')
        t.assert(stats.files.length, 'lists files')
      })
    })
  })
})
