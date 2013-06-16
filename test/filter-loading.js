"use strict"

var test = require('tape')
var Purge = require('../').Purge

test('listing flattened deps of packages', function(t) {
  t.plan(3)
  Purge.loadPatterns(__dirname + '/../Readme.md', function(err, patterns) {
    t.ifError(err)
    console.log(patterns)
  })
})
