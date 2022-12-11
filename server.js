const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: '*' } });

const port = process.env.PORT || 4000;

app.get('/', (req, res) => {
	res.send('<h1>Lets Party Server</h1>');
});

io.on('connection', (socket) => {
	socket.emit('whoami', { id: socket.id });
	// join to the room
	socket.on('joinmetothisroom', ({ roomId, name }) => {
		socket.join(roomId);
		socket.emit('joinmetothisroomsuccess', `${roomId} `);
		io.to(roomId).emit('someonejoined', name);
	});

	// tell everyone who are here in the room
	socket.on('tell_everyone_who_joined', ({ allusers, roomId }) => {
		io.to(roomId).emit('who_joined', allusers);
	});

	// check connection
	socket.on('msg', ({ data, roomId }) => {
		io.to(roomId).emit('msg', data);
	});

	socket.on('sendMessage', ({ roomId, ...args }) => {
		console.log('Room ID: ', roomId)
		console.log('Message payload: ', args)
		io.to(roomId).emit('newMessage', args)
	})

	// get video state
	socket.on('videoStates', ({ videoState, roomId }) => {
		io.to(roomId).emit('videoStates', videoState);
	});

	// disconnect
	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
});

server.listen(port, () => {
	console.log(`listening on ${port}`);
});
