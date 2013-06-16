"use strict"

var test = require('tape')
var Purge = require('../').Purge

test('filtering', function(t) {
  t.plan(2)

  var files = [
    '/module/example',
    '/module/lib',
    '/module/test',
    '/not_module/test'
  ]

  var filter = [
    'example',
    'test'
  ]

  var root = '/module'

  Purge.filter(root, files, filter, function(err, result) {
    t.ifError(err)
    t.deepEqual([
      '/module/example',
      '/module/test'
    ], result)
    t.end()
  })
})

