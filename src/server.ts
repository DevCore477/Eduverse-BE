import http from 'http';
import { Server } from 'socket.io';
import app from './app';

// Create HTTP server using Express app
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
export const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

// WebSocket Connection Handling
io.on('connection', async (socket) => {
  const userId = socket.handshake.auth?.userId
  console.log("user id in io is ", userId)

  if (!userId) {
    socket.disconnect();
    return;
  }

  try {
    const roomName = `user:${userId}`;
    socket.join(roomName);
    socket.emit('notifications:connected', { ok: true });
  } catch (error) {
    console.error('❌ Firebase token verification failed:', error);
    socket.disconnect();
  }
});

// Set the port, either from environment variables or fallback to 5000
const PORT = process.env.PORT || 5000;

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📄 Swagger docs available at http://localhost:${PORT}/api-docs`);
});
