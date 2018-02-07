'use strict'

const ENTER = 13
const ESC = 27
const INP_SLC = 'footer textarea'
const INPUT_ID = 'conversation'

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

app.createDivAndAppend = function (className, parent, innerHTML) {
    const div = document.createElement("div");
    div.className = className;
    if (innerHTML !== undefined) div.innerHTML = innerHTML
    parent.appendChild(div)
    return div
}

app.writeMessage = function (message) {
    const type = message.type || consts.USR_MSG
    let text = message.body.text || ''
    const from = message.body.from || ''
    const date = new Date()
    const time = date.getHours() + ":" + date.getMinutes()

    text = text.replace( /\n/g, ' <br> ');

    const messageEntry = app.createDivAndAppend("messageEntry", msgListEl)
    const senderDiv = app.createDivAndAppend("senderDiv", messageEntry, from)
    const timeDiv = app.createDivAndAppend("timeDiv", messageEntry, time)
    const messageDiv = app.createDivAndAppend("messageDiv", messageEntry, text)

    const textElement = document.createTextNode(message)
}

app.enableDisableChat = function (enable) {
    inputEl.disabled = !enable
    document.getElementById("sendMsgBtn").disabled = !enable
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
    if (e.keyCode === ENTER && (e.altKey || e.ctrlKey))
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
    msgListEl = document.getElementById(INPUT_ID)

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
        app.enableDisableChat(true)
        document.getElementById('msgToSend').focus()
    }
    this.socket.addEventListener('open', handleOpen)

    handleClose = function () {
        app.enableDisableChat(false)
        console.log("CLOSE", arguments)
        app.reconnect()
    }
    this.socket.addEventListener('close', handleClose)

    handleError = function () {
        app.enableDisableChat(false)
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