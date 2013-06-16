"use strict"

var test = require('tape')
var Purge = require('../').Purge
test('getting root package', function(t) {
  t.plan(2)
  Purge.getRoot(__dirname + '/fixtures/node_modules/shoe', function(err, pkgInfo) {
    t.ifError(err, 'no error')
    t.equal(pkgInfo.name, 'shoe', 'result is ')
    t.end()
  })
})

test('listing flattened deps of packages', function(t) {
  t.plan(3)
  Purge.packages(__dirname + '/fixtures/node_modules/shoe', function(err, packages) {
    t.ifError(err, 'no error')
    t.ok(Array.isArray(packages), 'result is an array')
    var packageNames = packages.map(function(p) {return p.name})
    // sockjs depends on node-uuid/faye-websocket, this tests that 
    // nested deps are listed at top level
    t.deepEqual(packageNames, [ 'node-uuid', 'faye-websocket', 'sockjs', 'sockjs-client' ], 'lists all deps of shoe (but not shoe)')
    t.end()
  })
})
