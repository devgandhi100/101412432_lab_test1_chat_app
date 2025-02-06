require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import routes and models
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const GroupMessage = require('./models/GroupMessage');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (update for production)
    methods: ["GET", "POST"],
  },
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Handle MongoDB disconnections and reconnections
mongoose.connection.on('disconnected', () => {
  console.error('MongoDB disconnected. Attempting to reconnect...');
  mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Socket.io Implementation
const users = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Error handling for socket errors
  socket.on('error', (err) => {
    console.error(`Socket error for ${socket.id}:`, err);
  });

  // When a user joins a room
socket.on('joinRoom', async ({ username, room }) => {
  try {
    socket.join(room);
    users[socket.id] = { username, room };

    // Notify other users in the room
    socket.to(room).emit('message', {
      type: 'system',
      user: 'System',
      message: `${username} has joined the room.`,
    });
  } catch (error) {
    console.error('Error handling joinRoom:', error);
  }
});

  // Handle sending messages
  socket.on('sendMessage', async ({ message }) => {
    try {
      const user = users[socket.id];
      if (user) {
        // Save the message to the database
        const groupMessage = new GroupMessage({
          from_user: user.username,
          room: user.room,
          message: message,
        });
        await groupMessage.save();

        // Emit the message to the room
        io.to(user.room).emit('message', {
          type: 'chat',
          user: user.username,
          message,
        });
      }
    } catch (error) {
      console.error('Error handling sendMessage:', error);
    }
  });

 // Handle typing events
  socket.on('typing', (isTyping) => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.room).emit('typing', {
        user: user.username,
        isTyping, // true or false
      });
    }
  });
  // Handle disconnects
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.room).emit('message', {
        type: 'system',
        user: 'System',
        message: `${user.username} has left the room.`,
      });
      delete users[socket.id];
    }
    console.log('A user disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));