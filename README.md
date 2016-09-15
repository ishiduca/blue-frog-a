# blue-frog-a

a prototype of the framework for JSON-RPC 2.0. using blue-frog-stream.

## useage

### server

```js
'use strict'
const http = require('http')
const path = require('path')
const ecstatic = require('ecstatic')(path.join(__dirname, 'static'))
const app      = http.createServer(ecstatic)
const rpc      = require('blue-frog-a')({prefix: '/rpc'})

function add (a, b) {return Number(a) + Number(b)}

rpc.dispatch('sum', (params, num, done) => {
    try {
        const result = params.reduce(add, num || 0)
        done(null, result)
    } catch (err) {
        done(err)
    }
})

rpc.dispatch('add', (params, num, done) => {
    try {
        const result = add(num || 0, params.shift())
        done(null, result)
    } catch (err) {
        done(err)
    }
})

rpc.dispatch('getCount', (params, num, done) => done(null, num || 0))

rpc.install(app)

app.listen(9999, () => console.log('Start to listen on port 9999'))
```

### client

```js
var hyperquest = require('hyperquest')
var blueflog   = require('blue-frog-a')

window.onload = function () {
    var hyp = hyperquest.post('http://0.0.0.0:9999/rpc')
    var client = blueflog(hyp)

    hyp.on(   'error', onError)
    client.on('error', onError)

    var sum = client.request('sum', [1,2,3])
    var add = client.notification('add', [7])
    var fin = client.request('getCount')

    sum.on('error', onError)
    add.on('error', onError)
    fin.on('error', onError)

    sum.once('data', function (result) {
        print('sum(1, 2, 3) => ' + result)
        // sum(1, 2, 3) => 6
    })

    fin.once('data', function (result) {
        print('add(sum(1, 2, 3), 7) => ' + result)
        // add(sum(1, 2, 3), 7) => 13
    })

    client.batch([sum, add, fin])
}

function onError (err) {
    console.error(err)
}
function print (str) {
    console.log(str)
}
```

## license

MIT
