'use strict'
var hyperquest = require('hyperquest')
var blueFlog   = require('blue-frog-a')

window.onload = function () {
    var hyp = hyperquest.post(location.origin)
    var rpc = blueFlog(hyp)

    var sum = rpc.request('sum', [1,2,3])
    var add = rpc.notification('add', [7])
    var fin = rpc.request('getCount')

    hyp.on('error', onError)
    rpc.on('error', onError)
    sum.on('error', onError)
    add.on('error', onError)
    fin.on('error', onError)

    sum.once('data', function (result) {
        print('sum(1, 2, 3) => ' + result)   
    })
    fin.once('data', function (result) {
        print('add(sum(1, 2, 3), 7) => ' + result)       
    })

    rpc.batch([sum, add, fin])
}

function onError (err) {
    console.error(err)
}

function print (str) {
    console.log(str)
}
