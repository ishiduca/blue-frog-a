var events   = require('events')
var stream   = require('readable-stream')
var inherits = require('inherits')
var through  = require('through2')
var body     = require('body/json')
var uuid     = require('uuid')
var request  = require('blue-frog-core/request')
var rpc      = require('blue-frog-stream')

module.exports = BlueFrog
module.exports.TadPole = TadPole

var NOTIFICATION = 'notification'
var REQUEST      = 'request'

inherits(BlueFrog, events.EventEmitter)
inherits(TadPole, stream.Transform)

function BlueFrog (httpclient) {
    if (!(this instanceof BlueFrog)) return new BlueFrog(httpclient)
    events.EventEmitter.call(this)

    var me    = this
    var batch = this.batchStream = new rpc.request.BatchStream(true)

    batch.on('error', onError)

    var setHeader = httpclient.setHeader || httpclient.setRequestHeader
    if (! setHeader) console.warn('"setHeader" or "setRequestHeader" not found in httpclient')

    batch
    .pipe(through.obj(function (json, _, done) {
        if (setHeader) {
            setHeader.apply(httpclient, ['content-type', 'applicaion/json'])
            setHeader.apply(httpclient, ['content-length', Buffer.byteLength(json)])
        }
        done(null, json)
    }))
    .pipe(httpclient)
    .once('response', function (resp) {
        body(resp, null, function (err, result) {
            if (err) return me.emit('error', err)
            new rpc.response.ParseStream(result).on('error', onError)
            .pipe(through.obj(function (response, _, done) {
                var tadpole = me.tadpoles[response.id]
                if (tadpole) tadpole.write(response)
                else warnNotFoundTadPoleId(response)
                done()
            }))
        })
    })

    function onError (err) {
        if (err.id && me.tadpoles[err.id])
            me.tadpoles[err.id].emit('error', err)
        else me.emit('error', err)
    }

    function warnNotFoundTadPoleId (res) {
        var err = new Error('tadpole not found :( [id: "' + String(res.id) + '"')
        err.data = res
        console.error(err)
        return err
    }
}

BlueFrog.prototype.request = function (method, params) {
    return new TadPole(method, params, REQUEST)
}

BlueFrog.prototype.notification = function (method, params) {
    return new TadPole(method, params, NOTIFICATION)
}

BlueFrog.prototype.batch = function (tadpoles) {
    var me        = this
    var _id       = uuid.v4().split('-').join('')
    this.tadpoles = [].concat(tadpoles).reduce(function (x, tadpole, i) {
        var id = _id + '--' + i
        x[id] = tadpole
        me.batchStream.write(tadpole.createRequest(id))
        return x
    }, {})
    this.batchStream.end()
}

function TadPole (method, params, type) {
    if (!(this instanceof TadPole)) return new TadPole(method, params, type)
    stream.Transform.call(this, {objectMode: true})
    this.type = type === NOTIFICATION ? NOTIFICATION : REQUEST
    this.args = [method, params]
}

TadPole.prototype._transform = function (response, _, done) {
    if (response.error) done(response.error)
    else done(null, response.result)
}

TadPole.prototype.createRequest = function (id) {
    this.id = id
    var args = [this.type === REQUEST ? id : null].concat(this.args)
    return request.apply(null, args)
}
