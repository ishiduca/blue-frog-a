'use strict'
const http = require('http')
const path = require('path')
const ecstatic = require('ecstatic')(path.join(__dirname, 'static'))
const app      = http.createServer(ecstatic)
const rpc      = require('blue-frog-a')({prefix: '/'})

function add (a, b) { return Number(a) + Number(b) }

rpc.dispatch('sum', (params, num, done) => {
    try {
        const result = params.reduce(add, num || 0)
        done(null, result)
    } catch (err) {
        return done(err)
    }
})

rpc.dispatch('add', (params, num, done) => {
    try {
        const result = add(num || 0, params.shift())
        done(null, result)
    } catch (err) {
        return done(err)
    }
})

rpc.dispatch('getCount', (params, num, done) => done(null, num || 0))

rpc.install(app)
module.exports = app

if (! module.parent) {
    app.listen(9999, () => {
        console.log('Start to listen on port "%s"', app.address().port)
    })
}
