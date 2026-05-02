// server.js
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 4000 });
const channels = {};  // channelId → Set of sockets
const userInfo = new Map(); // socket → user info

wss.on('connection', (ws) => {
  let userChannel = null;
  let userId = null;
  let userName = null;

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);

      // Handle join/switch channel
      if (data.type === 'join' || data.type === 'switch') {
        userId = data.userId;
        userName = data.userName;
        userInfo.set(ws, { userId, userName });

        // Leave old channel
        if (userChannel && channels[userChannel]) {
          channels[userChannel].delete(ws);
        }
        
        // Join new channel
        userChannel = data.channel || data.toChannel || 'general';
        if (!channels[userChannel]) channels[userChannel] = new Set();
        channels[userChannel].add(ws);

        // Broadcast presence
        const users = channels[userChannel].size;
        broadcast(userChannel, { type: 'presence', users });
      }

      // Handle chat messages
      if (data.type === 'message' || data.type === 'msg') {
        const messageData = {
          type: 'message',
          content: data.content || data.message,
          userId: data.userId || userId,
          userName: data.userName || userName,
          timestamp: new Date().toISOString(),
          id: Date.now()
        };
        broadcast(userChannel, messageData);
      }
    } catch (err) {
      console.error('WebSocket message parse error:', err);
    }
  });

  ws.on('close', () => {
    if (userChannel && channels[userChannel]) {
      channels[userChannel].delete(ws);
      // Broadcast updated presence
      const users = channels[userChannel].size;
      broadcast(userChannel, { type: 'presence', users });
    }
    userInfo.delete(ws);
  });
});

function broadcast(channel, data, excludeSocket = null) {
  if (!channels[channel]) return;
  const str = JSON.stringify(data);
  channels[channel].forEach(client => {
    if (client !== excludeSocket && client.readyState === 1) {
      client.send(str);
    }
  });
}

console.log('WS server running on ws://localhost:4000');