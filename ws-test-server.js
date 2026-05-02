import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 4000 });
const channels = {};  // channelId → Set of sockets

wss.on('connection', (ws) => {
  let userChannel = null;

  ws.on('message', (raw) => {
    const data = JSON.parse(raw);

    if (data.type === 'join' || data.type === 'switch') {
      // Leave old channel
      if (userChannel && channels[userChannel]) {
        channels[userChannel].delete(ws);
      }
      // Join new channel
      userChannel = data.channel || data.toChannel;
      if (!channels[userChannel]) channels[userChannel] = new Set();
      channels[userChannel].add(ws);

      // Broadcast presence
      const users = channels[userChannel].size;
      broadcast(userChannel, { type: 'presence', users: Array(users).fill({}) });
    }

    if (['message', 'reply', 'react', 'typing'].includes(data.type)) {
      broadcast(userChannel, data, ws); // send to everyone else
    }
  });

  ws.on('close', () => {
    if (userChannel && channels[userChannel]) {
      channels[userChannel].delete(ws);
    }
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
