var url      = require('url')
var body     = require('body/json')
var through  = require('through2')
var rpc      = require('blue-frog-stream')
var response = require('blue-frog-core/response')
var rpcError = require('blue-frog-core/error')

module.exports = BlueFrog

function BlueFrog (prefix) {
    if (!(this instanceof BlueFrog)) return new BlueFrog(prefix)

    var _prefix = '/'

    if (!prefix) prefix = {prefix: _prefix}
    if (typeof prefix === 'string') prefix = {prefix: prefix}
    if (! prefix.prefix) prefix.prefix = _prefix

    this.prefix   = prefix.prefix
    this.methods_ = {}
}

function handler (req, res) {
    var me  = this
    var flg = req.method.toUpperCase() === 'POST' &&
              url.parse(req.url).pathname === this.prefix

    if (! flg) return false

    body(req, res, function (err, result) {
        var c     = {state: null}
        var batch = rpc.response.BatchStream('do JSON.stringify')

        batch.on('error', console.log.bind(console))
            .pipe(through.obj(function (json, _, done) {
                res.setHeader('content-type', 'application/json')
                res.setHeader('content-length', Buffer.byteLength(json))
                done(null, json)
            }))
            .pipe(res)

        if (err) return batch.end(parseError(err))

        new rpc.request.ParseStream(result)
            .on('error', function (err) {
                batch.write(invalidRequest(err))
            })
            .pipe(through.obj(function (req, _, done) {
                var api = me.methods_[req.method]
                if (! api) return done(null, methodNotFound(req))
                api(req.params, c.state, function (err, result) {
                    if (err) return done(null, invalidParams(err, req))
                    c.state = result
                    if (! req.id) done() // notification
                    else done(null, response(req.id, c.state))
                })
            }))
            .pipe(batch)
    })

    return true
}

function parseError (err) {
    return response.error(null, rpcError.ParseError(err))
}

function invalidRequest (err) {
    return response.error(err.id || null, rpcError.InvalidRequest(err))
}

function methodNotFound (req) {
    return response.error(req.id || null
            , rpcError.MethodNotFound('method "' + req.method + '" not found'))
}

function invalidParams (err, req) {
    return response.error(req.id || err.id || null
            , rpcError.InvalidParams(err))
}

BlueFrog.prototype.dispatch = function (method, f) {
    return !! (this.methods_[method] = f)
}

BlueFrog.prototype.install = function (server) {
    var me = this
    var EVENT_NAME   = 'request'
    var oldListeners = server.listeners(EVENT_NAME).slice(0)
    var newListener  = function (/*req, res*/) {
        if (handler.apply(me, arguments) !== true) {
            for (var i = 0; i < oldListeners.length; i++) {
                //oldListeners[i].apply(null, arguments)
                oldListeners[i].apply(server, arguments)
            }
            return false
        }
        return true
    }
    server.removeAllListeners(EVENT_NAME)
    server.addListener(EVENT_NAME, newListener)
}
