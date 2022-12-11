let videoplayer
let adTimer
let myid
let roomId
let iamhost = false
let allusersinroom = []
let messages = []
let myId

const socket = io('http://localhost:4000/')

socket.on('whoami', function ({ id }) {
  // console.log('myid', id);
  myid = id
  myId = new Date().getTime()
})

function checkIsAdPlayng() {
  adTimer = setInterval(() => {
    let isAd = document.querySelector('.ad-cta-wrapper')
    if (isAd === null) {
      getVideoPlayer()
    }
  }, 1000)
}

function getVideoPlayer() {
  clearInterval(adTimer)

  videoplayer = document.querySelector('video')

  if (videoplayer) {
    videoplayer.removeAttribute('autoplay')
  }

  //keep listening to the hosts videoplayer events, only host can control the play pause and seek
  setInterval(() => {
    syncVideoStates()
  }, 1000)
}

function syncVideoStates() {
  let videoState = {
    hosttime: videoplayer?.currentTime,
    isHostPaused: videoplayer?.paused
  }
  socket.emit('videoStates', { videoState, roomId })
}

// listen to hosts video player states

socket.on('videoStates', ({ isHostPaused, hosttime }) => {
  // sync video player pause and play of users with the host
  if (!iamhost) {
    if (isHostPaused) {
      videoplayer?.pause()
    } else {
      videoplayer?.play()
    }

    let diffOfSeek = videoplayer?.currentTime - hosttime

    // sync time if any user is behind by more than 8 s (in case of poor connection)
    // or if any user is forward 8s than everyone
    if (diffOfSeek < -8 || diffOfSeek > 8) {
      videoplayer.currentTime = hosttime
    }
  }
})

/* HTML OUTPUT ON BROWSER */

const hostbutton = document.createElement('div')
hostbutton.innerHTML = 'Start New Room'

const status = document.createElement('div')
status.id = 'status-container'

const main_container = document.createElement('DIV')
const start_container = document.createElement('DIV')
const roomlabel = document.createElement('DIV')
const input = document.createElement('INPUT')
const letspartytitle = document.createElement('DIV')
const nameinput = document.createElement('INPUT')
const joinbutton = document.createElement('DIV')
const closeBtn = document.createElement('div')

hostbutton.id = 'host-btn'
main_container.classList.add('main-container')
start_container.classList.add('start-container')

letspartytitle.id = 'lets-party-title'
letspartytitle.innerHTML = "Let's Party! 📺 "

roomlabel.id = 'room-label'
input.id = 'room-id-input'
nameinput.id = 'name-id'
nameinput.placeholder = 'Enter display name'
input.placeholder = 'Enter room Code'
joinbutton.id = 'join-btn'
closeBtn.id = 'close-btn'

// :: Message input properties
const messageInput = document.createElement('input')
messageInput.id = 'message-input'
messageInput.placeholder = 'Send a message!'

messageInput.addEventListener('keyup', (event) => {
  if (event.target.value?.trim()) {
    sendButton.classList.remove('disabled')

    if (event.key === 'Enter' || event.keyCode === 13) {
      sendMessage(event.target.value)
      messageInput.value = ''
      sendButton.className = 'disabled'
    }
  } else {
    if (!sendButton.classList.contains('disabled')) {
      sendButton.className = 'disabled'
    }
  }
})

// :: Message bubble properties
const messageBubble = document.createElement('div')
messageBubble.className = 'message-bubble'

// :: Message send button properties
const sendButton = document.createElement('div')
sendButton.id = 'send-button'
sendButton.className = 'disabled'
sendButton.innerHTML = 'Send message'

sendButton.addEventListener('click', (event) => {
  sendMessage(messageInput.value)

  if (messageInput.value) {
    sendButton.className = 'disabled'
  }
  messageInput.value = ''
})

// :: Messages container
const messageContainer = document.createElement('div')
messageContainer.className = 'messages-container'

roomlabel.innerHTML = `OR`
joinbutton.innerHTML = `Join`
closeBtn.innerHTML = '❌'

start_container.appendChild(letspartytitle)
start_container.appendChild(hostbutton)
start_container.appendChild(roomlabel)
start_container.appendChild(input)
start_container.appendChild(joinbutton)
start_container.appendChild(status)

start_container.appendChild(nameinput)

main_container.appendChild(start_container)
main_container.appendChild(closeBtn)

document.querySelector('body').appendChild(main_container)

hostbutton.addEventListener('click', () => {
  if (nameinput.value !== '') {
    localStorage.setItem('lets_party_uname', nameinput.value)
    socket.emit('joinmetothisroom', {
      roomId: myid,
      name: nameinput.value,
      urlToWatch: window.location.href
    })
    roomId = myid
    iamhost = true
  } else {
    alert('Enter your display name')
  }
})

joinbutton.addEventListener('click', () => {
  if (input.value !== '' && nameinput.value !== '') {
    localStorage.setItem('lets_party_uname', nameinput.value)
    socket.emit('joinmetothisroom', {
      roomId: input.value,
      name: nameinput.value
    })
    roomId = input.value
  } else {
    alert('Enter your Code and Display Name')
  }
})

closeBtn.addEventListener('click', () => {
  main_container.style.right = '-100%'
})

socket.on('joinmetothisroomsuccess', ({ inviteUrl }) => {
  const roomCode = `<textarea class="roomcode">${inviteUrl}</textarea>`

  roomlabel.style.display = 'none'
  input.style.display = 'none'
  joinbutton.style.display = 'none'
  hostbutton.style.display = 'none'
  nameinput.style.display = 'none'
  start_container.appendChild(messageInput)
  start_container.appendChild(sendButton)

  status.innerHTML = `Room Code: <br>${roomCode} <br/> Tell everyone to join here! <br>`

  /* 	setTimeout(() => {
		socket.emit('msg', { data: 'hey', roomId });
	}, 10000); */

  checkIsAdPlayng()
})

socket.on('someonejoined', (name) => {
  if (iamhost) {
    status.innerHTML += ` ${name} joined! <br>`
    allusersinroom.push(name)
    socket.emit('tell_everyone_who_joined', {
      allusers: allusersinroom,
      roomId
    })
  }
})

socket.on('who_joined', (allusers) => {
  if (!iamhost) {
    allusers?.forEach((user) => {
      status.innerHTML += ` ${user} joined! <br>`
    })
  }
})

socket.on('newMessage', (payload) => {
  if (payload.authorId !== myId) {
    status.innerHTML += `${payload.authorName} says: ${payload.text} </br>`
  }
})

function sendMessage(value) {
  if (value !== '') {
    const message = {
      authorId: myId,
      text: value,
      authorName: nameinput.value,
      roomId: roomId
    }
    status.innerHTML += `${nameinput.value} says: ${value} </br>`
    socket.emit('sendMessage', message)
  }
}

socket.on('msg', (msg) => {
  console.log(msg)
})

document.querySelector('body').appendChild(main_container)
