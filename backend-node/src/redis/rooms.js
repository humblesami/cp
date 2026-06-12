const { getRedis } = require("./client");
const { v4: uuidv4 } = require("uuid");

const ROOM_TTL = 60 * 60 * 2; // 2 hours

function roomKey(roomId) { return `room:${roomId}`; }
function lockKey(roomId) { return `lock:room:${roomId}`; }

async function createRoom({ name, createdByUserId, createdByUsername, isPrivate = false }) {
  const redis = getRedis();
  const roomId = uuidv4().slice(0, 8).toUpperCase();

  const room = {
    id: roomId,
    name,
    status: "waiting",        // waiting | in_progress | finished
    isPrivate: isPrivate ? "1" : "0",
    createdBy: createdByUserId,
    seats: JSON.stringify({
      0: { userId: createdByUserId, username: createdByUsername, isBot: false, connected: true },
      1: null,
      2: null,
      3: null,
    }),
    createdAt: Date.now().toString(),
  };

  await redis.hSet(roomKey(roomId), room);
  await redis.expire(roomKey(roomId), ROOM_TTL);

  return roomId;
}

async function getRoom(roomId) {
  const redis = getRedis();
  const data = await redis.hGetAll(roomKey(roomId));
  if (!data || !data.id) return null;
  data.seats = JSON.parse(data.seats);
  data.isPrivate = data.isPrivate === "1";
  return data;
}

async function listPublicRooms() {
  const redis = getRedis();
  const keys = await redis.keys("room:*");
  const rooms = [];
  for (const key of keys) {
    const data = await redis.hGetAll(key);
    if (!data.id || data.isPrivate === "1") continue;
    const seats = JSON.parse(data.seats);
    const playerCount = Object.values(seats).filter(Boolean).length;
    rooms.push({ id: data.id, name: data.name, status: data.status, playerCount });
  }
  return rooms;
}

/**
 * Atomic join using Redis SET NX lock.
 * Returns the seat number (0-3) or throws ROOM_FULL / ALREADY_IN_ROOM.
 */
async function joinRoom(roomId, userId, username) {
  const redis = getRedis();

  // Acquire lock
  const locked = await redis.set(lockKey(roomId), userId, { NX: true, EX: 5 });
  if (!locked) {
    // Another join is in-flight — wait 150ms and retry once
    await new Promise((r) => setTimeout(r, 150));
    return joinRoom(roomId, userId, username);
  }

  try {
    const data = await redis.hGetAll(roomKey(roomId));
    if (!data.id) throw new Error("ROOM_NOT_FOUND");

    const seats = JSON.parse(data.seats);

    // Check if already seated
    const alreadySeated = Object.values(seats).find((s) => s && s.userId === userId);
    if (alreadySeated) throw new Error("ALREADY_IN_ROOM");

    // Find first empty seat
    const emptySeat = Object.entries(seats).find(([, v]) => v === null);
    if (!emptySeat) throw new Error("ROOM_FULL");

    const seatIndex = emptySeat[0];
    seats[seatIndex] = { userId, username, isBot: false, connected: true };

    const playerCount = Object.values(seats).filter(Boolean).length;
    const newStatus = playerCount === 4 ? "ready" : "waiting";

    await redis.hSet(roomKey(roomId), {
      seats: JSON.stringify(seats),
      status: newStatus,
    });

    return { seatIndex: parseInt(seatIndex), playerCount, status: newStatus };
  } finally {
    await redis.del(lockKey(roomId)); // always release lock
  }
}

async function leaveRoom(roomId, userId) {
  const redis = getRedis();
  const data = await redis.hGetAll(roomKey(roomId));
  if (!data.id) return;

  const seats = JSON.parse(data.seats);
  for (const [idx, seat] of Object.entries(seats)) {
    if (seat && seat.userId === userId) {
      seats[idx] = null;
      break;
    }
  }

  const playerCount = Object.values(seats).filter(Boolean).length;
  if (playerCount === 0) {
    await redis.del(roomKey(roomId));
    return { deleted: true };
  }

  await redis.hSet(roomKey(roomId), { seats: JSON.stringify(seats), status: "waiting" });
  return { deleted: false, playerCount };
}

async function markDisconnected(roomId, userId) {
  const redis = getRedis();
  const data = await redis.hGetAll(roomKey(roomId));
  if (!data.id) return;
  const seats = JSON.parse(data.seats);
  for (const seat of Object.values(seats)) {
    if (seat && seat.userId === userId) {
      seat.connected = false;
      break;
    }
  }
  await redis.hSet(roomKey(roomId), { seats: JSON.stringify(seats) });
}

async function markReconnected(roomId, userId) {
  const redis = getRedis();
  const data = await redis.hGetAll(roomKey(roomId));
  if (!data.id) return;
  const seats = JSON.parse(data.seats);
  for (const seat of Object.values(seats)) {
    if (seat && seat.userId === userId) {
      seat.connected = true;
      seat.isBot = false;
      break;
    }
  }
  await redis.hSet(roomKey(roomId), { seats: JSON.stringify(seats) });
}

async function findActiveRoomByUserId(userId) {
  const redis = getRedis();
  const keys = await redis.keys("room:*");
  for (const key of keys) {
    const data = await redis.hGetAll(key);
    if (!data.id) continue;
    const seats = JSON.parse(data.seats);
    const inRoom = Object.values(seats).some((s) => s && s.userId === userId);
    if (inRoom) {
      return { roomId: data.id, status: data.status };
    }
  }
  return null;
}

module.exports = { 
  createRoom, 
  getRoom, 
  listPublicRooms, 
  joinRoom, 
  leaveRoom, 
  markDisconnected, 
  markReconnected,
  findActiveRoomByUserId
};
