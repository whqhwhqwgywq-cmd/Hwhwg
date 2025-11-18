const express = require("express");
const { PeerServer, ExpressPeerServer } = require("peer");
const fs = require("fs");

const app = express();
app.use(express.json());

const peerServer = PeerServer({
  port: 9000,
  path: "/myapp",
  proxied: true,
  ssl: {
    key: fs.readFileSync("/path/to/ssl.key"),
    cert: fs.readFileSync("/path/to/ssl.crt"),
    SNICallback: (servername, cb) => {
      // custom SNI logic if needed
    },
  },
  generateClientId: () =>
    (Math.random().toString(36) + "0000000000000000000").substr(2, 16),
});

let waiting = null;

app.post("/match", (req, res) => {
  if (!waiting) {
    const roomId = "room-" + Date.now().toString(36);
    waiting = { room: roomId, hostId: `room:${roomId}:host` };
    return res.json({ role: "host", room: roomId, hostId: waiting.hostId });
  } else {
    const pair = waiting;
    waiting = null;
    return res.json({ role: "guest", room: pair.room, hostId: pair.hostId });
  }
});

const server = app.listen(8080, () => {
  console.log("Matchmaking on :8080");
});

const peerExpress = ExpressPeerServer(server, {
  debug: true,
  path: "/myapp",
});
app.use("/peerjs", peerExpress);

peerExpress.on("connection", (client) => {
  console.log("Connected:", client.getId());
});
peerExpress.on("disconnect", (client) => {
  console.log("Disconnected:", client.getId());
});
