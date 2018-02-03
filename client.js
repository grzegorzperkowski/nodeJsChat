'use strict'

const ENTER = 13
const ESC = 27
const INP_SLC = 'footer textarea'
const LST_SLC = 'ul#messages'

let inputEl, msgListEl
let handleClose, handleError, handleMessage, handleOpen;
let lastCommentsAuthor

function getNickFromUrl(url) {
    var searchParams = new URLSearchParams(url);
    searchParams.get("nick")
    return searchParams.get("nick")
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
    const senderSpan = document.createElement('span')
    const messageDiv = document.createElement('div')
    const timeDiv = document.createElement('div')
    timeDiv.className = 'timeDiv'
    messageDiv.className = 'messageWindow'

    const date = new Date()
    timeDiv.innerText = date.getHours() + ":" + date.getMinutes()
    senderSpan.appendChild(timeDiv)

    const fromElement = document.createTextNode(from)

    if (from && lastCommentsAuthor == from && message.type != consts.SYS_MSG)
        fromElement.data = ''
    else {
        const br = document.createElement('hr')
        li.appendChild(br)
    }

    li.appendChild(senderSpan)
    li.appendChild(messageDiv)
    const textElement = document.createTextNode(text)

    senderSpan.appendChild(fromElement)

    lastCommentsAuthor = from;
    messageDiv.appendChild(textElement)
    msgListEl.appendChild(li)
    msgListEl.scrollTop = msgListEl.scrollHeight
}

app.sendMessage = function () {
    const text = document.getElementById("msgToSend").value

    if (text.trim() === '')
        return;

    const message = {
        type: consts.USR_MSG,
        body: {
            text: text,
            from: this.me
        }
    }

    this.socket.send(JSON.stringify(message))
    this.writeMessage(message)
    document.getElementById("msgToSend").value = ''
}

const handleOnKeyDown = function (e) {
    if (e.keyCode === ENTER && ( e.altKey || e.ctrlKey ) )
        app.sendMessage()
}


const handleKeyUp = function (e) {
    if (document.getElementById("msgToSend").value.trim().length > 0)
        document.getElementById("sendMsgBtn").disabled = false
    else
        document.getElementById("sendMsgBtn").disabled = true;

    switch (e.keyCode) {
        case ESC:
            e.preventDefault()
            document.getElementById("msgToSend").value = ''
    }
}

app.init = function () {
    inputEl = document.querySelector(INP_SLC)
    msgListEl = document.querySelector(LST_SLC)

    inputEl.addEventListener('keyup', handleKeyUp)
    inputEl.addEventListener('keydown', handleOnKeyDown)

    app.connect()
}

app.connect = function () {
    const host = location.host
    this.socket = new WebSocket('ws://' + host)
    this.connecting = true;

    handleMessage = function (e) {
        const msg = JSON.parse(e.data)
        switch (msg.type) {
            case consts.USR_MSG:
            case consts.SYS_MSG:
                app.writeMessage(msg)
                break;
        }
    }
    this.socket.addEventListener('message', handleMessage)

    handleOpen = function () {
        app.connecting = false;
        const toSend = JSON.stringify({
            type: consts.JOIN,
            body: app.me,
        })
        app.socket.send(toSend)
        inputEl.removeAttribute('disabled')
    }
    this.socket.addEventListener('open', handleOpen)

    handleClose = function () {
        console.log("CLOSE", arguments)
        app.reconnect()
    }
    this.socket.addEventListener('close', handleClose)

    handleError = function () {
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