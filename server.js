const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const crypto = require('crypto')
const io = require('socket.io')(server, { cors: { origin: '*' } })

require('dotenv').config()

const ALGORITHM = 'aes-128-cbc'

const port = process.env.PORT || 4000

app.get('/', (req, res) => {
  res.send('<h1>Lets Party Server</h1>')
})

app.get('/watch/:id', (req, res) => {
  const decipher = crypto.createDecipheriv(ALGORITHM, process.env.SECURITY_KEY, process.env.INIT_VECTOR)

  let decryptedData = decipher.update(req.params.id, 'hex', 'utf-8')

  decryptedData += decipher.final('utf8')

  console.log({
    decrypted: decryptedData,
    query: req.query
  })

  return res.redirect(`${decryptedData}#${req.query.room_code}`)
})

io.on('connection', (socket) => {
  socket.emit('whoami', { id: socket.id })
  // join to the room
  socket.on('joinmetothisroom', ({ roomId, name, urlToWatch }) => {
    console.log(urlToWatch)
    const cipher = crypto.createCipheriv(ALGORITHM, process.env.SECURITY_KEY, process.env.INIT_VECTOR)

    let encryptedData = cipher.update(urlToWatch, 'utf-8', 'hex')

    encryptedData += cipher.final('hex')

    const inviteUrl = `http://localhost:4000/watch/${encryptedData}?room_code=${roomId}`

    socket.join(roomId)
    socket.emit('joinmetothisroomsuccess', {
      roomId,
      inviteUrl
    })
    io.to(roomId).emit('someonejoined', name)
  })

  // tell everyone who are here in the room
  socket.on('tell_everyone_who_joined', ({ allusers, roomId }) => {
    io.to(roomId).emit('who_joined', allusers)
  })

  // check connection
  socket.on('msg', ({ data, roomId }) => {
    io.to(roomId).emit('msg', data)
  })

  socket.on('sendMessage', ({ roomId, ...args }) => {
    console.log('Room ID: ', roomId)
    console.log('Message payload: ', args)
    io.to(roomId).emit('newMessage', args)
  })

  // get video state
  socket.on('videoStates', ({ videoState, roomId }) => {
    io.to(roomId).emit('videoStates', videoState)
  })

  // disconnect
  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})

server.listen(port, () => {
  console.log(`listening on ${port}`)
})
