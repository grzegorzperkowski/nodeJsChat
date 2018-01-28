'use strict'

const http = require('http')
const path = require('path')
const url = require('url')
const fs = require('fs')
const ws = require('websockets')
const uuid = require('uuid')
var consts = require('./consts')

const PORT = 8080
const HOST = 'localhost'

var sockets = {}
var httpServer, wsServer

function GetContentType(name) {
    const ext = path.extname(name)
    switch (ext) {
        case '.html': case '.htm':
            return 'text/html'
            break;
        case '.css':
            return 'text/css'
        case '.js':
            return 'test/javascript'
        case '.png':
            return 'image/png'
        default:
            return 'default/text';
    }
}


httpServer = http.createServer(function (req, res) {
    let name = __dirname

    if (/^\/$/.test(req.url)) {
        name += '/index.html'
    } else {
        name += url.parse(req.url).pathname
    }

    fs.exists(name, exists => {

        if (exists) {
            res.writeHead(200, {
                "Content-Type": GetContentType(name)
            })

            fs.readFile(name, (err, data) => {
                if (err) err;

                res.end(data)
            })
        }
        else {
            res.writeHead(404)
            res.end()
        }
    })
})

function broadCast(data, ignoreId) {
    if (typeof data != 'string') {
        data = JSON.stringify(data)
    }
    // sockets.forEach(s => {
    //     if(id!=ignoreId && s.readyState === ws.OPEN){
    //         s.send()
    //     }
    // });

    for (const id in sockets) {
        if (id != ignoreId) {
            sockets[id].send(data);
        }
    }
}


wsServer = ws.createServer({
    server: httpServer
})

wsServer.on('connect', function (socket) {
    const id = uuid.v1()
    sockets[id] = socket
    console.log("New socket: " + id)
    socket.on('message', function (data) {
        const message = JSON.parse(data);
        console.log("A new message arrived. type: " + message.type + ", text: " + message.body)
        switch (message.type) {
            case consts.JOIN:
                const nick = message.body;
                console.log("Join: " + nick)
                broadCast({
                    type: consts.SYS_MSG,
                    body: {
                        text: nick + ' dołączył do pokoju'
                    }
                }, id)
                break;
            case consts.USR_MSG:
                broadCast(data, id)
                break;
        }
    })

    socket.on('close', function () {
        console.log("Socket closed " + id)
        delete socket[id]
    })
}).listen(PORT, HOST, () => console.log("Server is running on port: " + PORT))