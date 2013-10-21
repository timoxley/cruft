"use strict"

var fs = require('fs-extra')
var Cruft = require('../index')
var test = require('tape')

test('it removes cruft', function(t) {
  t.plan(4)
  fs.remove(__dirname + '/tmp/', function(err) {
    if (err) return console.error('error', err)
    fs.copy(__dirname + '/fixtures/simple', __dirname + '/tmp', function(err) {
      if (err) return console.error('error', err)
      Cruft.load(__dirname + '/../Readme.md', function(err, cruft) {
        t.ifError(err, 'no error')
        Cruft({
          dir: __dirname + '/tmp',
          cruft: cruft,
          force: true
        }, function(err, stats) {
          t.ifError(err, 'no error')
          t.assert(stats.after < stats.before, 'reduces total size. before: '+stats.before+' after: ' + stats.after)
          t.assert(stats.files.length, 'lists files. length: ' + stats.files.length)
        })
      })
    })
  })
})
