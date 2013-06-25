"use strict"

var fs = require('fs-extra')
var Cruft = require('../index')
var test = require('tape')

test('it prunes packages', function(t) {
  t.plan(2)
  fs.remove(__dirname + '/tmp/', function(err) {
    if (err) return console.error('error', err)
    fs.copy(__dirname + '/fixtures/simple', __dirname + '/tmp', function(err) {
      if (err) return console.error('error', err)
      fs.copy(__dirname + '/fixtures/prune/', __dirname + '/tmp/node_modules/prune/', function(err) {
        Cruft(__dirname + '/tmp', __dirname + '/../Readme.md', function(err, stats) {
          t.ifError(err, 'no error')
          t.assert(!fs.existsSync(__dirname + '/tmp/node_modules/prune'), 'removes prune package')
        })
      })
    })
  })
})


