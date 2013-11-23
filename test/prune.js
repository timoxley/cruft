"use strict"

var fs = require('fs-extra')
var Cruft = require('../index')
var test = require('tape')

test('it prunes packages', function(t) {
  t.plan(3)
  fs.remove(__dirname + '/tmp/', function(err) {
    if (err) return console.error('error', err)
    fs.copy(__dirname + '/fixtures/simple', __dirname + '/tmp', function(err) {
      if (err) return console.error('error', err)
      fs.copy(__dirname + '/fixtures/prune/', __dirname + '/tmp/node_modules/prune/', function(err) {
        Cruft.load(__dirname + '/../Readme.md', function(err, cruft) {
          t.ifError(err, 'no error')
          Cruft({
            dir: __dirname + '/tmp',
            cruft: cruft,
            force: true
          }, function(err, stats) {
            t.ifError(err, 'no error')
            t.assert(!fs.existsSync(__dirname + '/tmp/node_modules/prune'), 'removes prune package')
          })
        })
      })
    })
  })
})


