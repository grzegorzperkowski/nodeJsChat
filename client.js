'use strict'

const ENTER = 13
const ESC = 27
const INP_SLC = 'footer input'
const LST_SLC = 'ul#messages'

var inputEl, msgListEl


function getNickFromUrl(url) {
    return url.substr(url.indexOf("?") + 1).split("&").filter( s => s.startsWith('nick='))[0].split('=')[1]
}


var app = {
    me: getNickFromUrl(location.search),
    connecting: false,
    socket: null,
}

app.writeMessage = function (message) {
    const type = message.type || consts.USR_MSG
    const text = message.body.text || ''
    const from = message.body.from || ''

    const li = document.createElement('li')
    const span = document.createElement('span')
    const div = document.createElement('div')

    li.appendChild(span)
    li.appendChild(div)
    const textElement = document.createTextNode(text)
    const fromElement = document.createTextNode(from)

    if (from) {
        span.appendChild(fromElement)
    }

    div.appendChild(textElement)
    msgListEl.appendChild(li)
    msgListEl.scrollTop = msgListEl.scrollHeight
}

app.sendMessage = function (text) {
    const message = {
        type: consts.USR_MSG,
        body: {
            text: text,
            from: this.me
        }
    }

    this.socket.send(JSON.stringify(message))
    this.writeMessage(message)
}

app.init = function () {
    inputEl = document.querySelector(INP_SLC)
    msgListEl = document.querySelector(LST_SLC)

    inputEl.addEventListener('keyup', e => {
        switch (e.keyCode) {
            case ENTER:
                e.preventDefault()
                const msg = document.getElementById("msgToSend").value
                app.sendMessage(msg)
                document.getElementById("msgToSend").value = ''
                break
            case ESC:
                e.preventDefault()
                document.getElementById("msgToSend").value = ''
        }
    })

    this.connect()
}


app.connect = function () {
    const host = location.host
    this.socket = new WebSocket('ws://' + host)
    this.connecting = true;

    const handleMessage = function (e) {
        const msg = JSON.parse(e.data)
        console.log("@@@: " + msg)
        switch (msg.type) {
            case consts.USR_MSG:
            case consts.SYS_MSG:
                app.writeMessage(msg)
                break;
        }
    }
    this.socket.addEventListener('message', handleMessage)

    const handleOpen = function () {
        app.connecting = false;
        const toSend = JSON.stringify({
            type: consts.JOIN,
            body: app.me,
        })
        app.socket.send(toSend)
        inputEl.removeAttribute('disabled')
    }
    this.socket.addEventListener('open', handleOpen)

    const handleClose = function () {
        console.log("CLOSE", arguments)
        app.reconnect()
    }
    this.socket.addEventListener('close', handleClose)

    const handleError = function () {
        console.error("ERROR", arguments)
        app.connecting = false;
    }

    this.socket.addEventListener('error', handleError)
}

app.reconnect = function () {
    if (!app.connecting) {
        app.socket.close()
        app.socket.removeEventListener('open', handleOpen)
        app.socket.removeEventListener('message', handleMessage)
        app.socket.removeEventListener('close', handleClose)
        app.socket.removeEventListener('error', handleClose)
        setTimeout(() => {
            app.connect()
        }, 1000);
    }
}