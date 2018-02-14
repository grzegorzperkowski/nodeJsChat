'use strict'

const http = require('http')
const path = require('path')
const url = require('url')
const fs = require('fs')
const ws = require('websockets')
const uuid = require('uuid')
var consts = require('./consts')
const PORT = 8080
const HOST = ''

const mongo = require('mongodb')
const databaseUrl = 'mongodb://localhost:27017/chat'
var sockets = {}
var httpServer, wsServer
var chatDB

mongo.connect(databaseUrl, function (err, client) {
    if (err) throw err
    try {
        chatDB = client.db('chatHistory')
    } catch (error) {
        console.error(error)
    }
    console.log("Database has been created!")
})

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

function writeMsgToDB(messageType, message, author) {
    if (!chatDB) return

    const chatEntry = { type: messageType, message: message, author: author, date: new Date(), }
    chatDB.collection("chatHistory").insertOne(chatEntry, function (err, res) {
        if (err) {
            console.error("Unable to write history: " + err)
            return
        }
        console.info(res);
    })
}

function sendLastMessagesFromDB(clientId) {
    if (!chatDB) return

    const lastRecords = chatDB.collection("chatHistory").find({ type: { $eq: consts.USR_MSG } }).limit(10).sort('date')
    if (!lastRecords) return
    lastRecords.on("error", e => console.error("@@@ERROR: " + e))
    lastRecords.on("data", data => {
        if (data)
            sendMessagesToClient(
                {
                    type: data.type,
                    body:
                        {
                            message: data.message,
                            date: data.date,
                            author: data.author
                        }
                }
                , clientId)
    })

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

    for (const id in sockets) {
        if (id != ignoreId) {
            sockets[id].send(data);
        }
    }
}

function sendMessagesToClient(data, clientId) {
    if (typeof data != 'string') {
        data = JSON.stringify(data)
    }

    const client = sockets[clientId]
    if (client) {
        client.send(data)
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
        console.log("A new message arrived. type: " + message.type + ", message: " + message.body.message)

        writeMsgToDB(message.type, message.body.message, message.body.author)

        switch (message.type) {
            case consts.SYS_MSG:
                const nick = message.body.author;
                console.log("Join: " + nick)
                broadCast({
                    type: consts.SYS_MSG,
                    body: {
                        text: nick + ' dołączył do pokoju'
                    }
                }, id)
                sendLastMessagesFromDB(id)
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

process.on('beforeExit', ()=>{if(chatDB)chatDB.close().wait()})
