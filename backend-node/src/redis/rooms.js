const { getRedis } = require("./client");
const { v4: uuidv4 } = require("uuid");

const ROOM_TTL = 60 * 60 * 2; // 2 hours

function roomKey(roomId) { return `room:${roomId}`; }
function lockKey(roomId) { return `lock:room:${roomId}`; }

async function createRoom({ name, description = "", createdByUserId, createdByUsername, isPrivate = false }) {
  const redis = getRedis();
  const roomId = uuidv4().slice(0, 8).toUpperCase();

  const room = {
    id: roomId,
    name,
    description: description.slice(0, 255),
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
    rooms.push({ 
      id: data.id, 
      name: data.name, 
      description: data.description || "",
      status: data.status, 
      playerCount 
    });
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
  const locked = await redis.set(lockKey(roomId), String(userId), { NX: true, EX: 5 });
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
    const newStatus = data.status === "in_progress" ? "in_progress" : (playerCount === 4 ? "ready" : "waiting");

    await redis.hSet(roomKey(roomId), {
      seats: JSON.stringify(seats),
      status: newStatus,
    });

    return { seatIndex: parseInt(seatIndex), playerCount, status: newStatus };
  } finally {
    await redis.del(lockKey(roomId)); // always release lock
  }
}

async function leaveRoom(roomId, userId, isAdminConnected = true) {
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
  
  // Room should only be deleted if empty AND the admin is disconnected from the website
  if (playerCount === 0 && !isAdminConnected) {
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

async function findAdminRoomsByUserId(userId) {
  const redis = getRedis();
  const keys = await redis.keys("room:*");
  const adminRooms = [];
  for (const key of keys) {
    const data = await redis.hGetAll(key);
    if (!data.id) continue;
    if (parseInt(data.createdBy) === parseInt(userId)) {
      adminRooms.push(data);
    }
  }
  return adminRooms;
}

async function transferAdmin(roomId, newAdminUserId) {
  const redis = getRedis();
  await redis.hSet(roomKey(roomId), { createdBy: newAdminUserId });
}

async function updateRoomMetadata(roomId, nameOrFields, description) {
  const redis = getRedis();
  const updates = {};

  if (typeof nameOrFields === "object" && nameOrFields !== null) {
    const fields = nameOrFields;
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.description !== undefined) updates.description = fields.description.slice(0, 255);
    if (fields.status !== undefined) updates.status = fields.status;
    if (fields.isPrivate !== undefined) updates.isPrivate = fields.isPrivate ? "1" : "0";
    if (fields.createdBy !== undefined) updates.createdBy = fields.createdBy;
  } else {
    if (nameOrFields !== undefined) updates.name = nameOrFields;
    if (description !== undefined) updates.description = description.slice(0, 255);
  }

  if (Object.keys(updates).length > 0) {
    await redis.hSet(roomKey(roomId), updates);
  }
}

async function deleteRoom(roomId) {
  const redis = getRedis();
  await redis.del(roomKey(roomId));
}

async function createSoloRoom(createdByUserId, createdByUsername) {
  const redis = getRedis();
  const roomId = "SOLO-" + uuidv4().slice(0, 5).toUpperCase();

    const botNames = ["Fatima", "Amna", "Ayesha", "Zainab", "Maryam", "Khadija", "Hafsa", "Sara"].sort(() => 0.5 - Math.random());
    const seats = JSON.stringify({
      0: { userId: createdByUserId, username: createdByUsername, isBot: false, connected: true },
      1: { userId: "bot_1", username: botNames[0], isBot: true, connected: true },
      2: { userId: "bot_2", username: botNames[1], isBot: true, connected: true },
      3: { userId: "bot_3", username: botNames[2], isBot: true, connected: true },
    });

  const room = {
    id: roomId,
    name: `${createdByUsername}'s Solo Table`,
    description: "Solo game with bots.",
    status: "waiting",
    isPrivate: "1",
    createdBy: createdByUserId,
    seats,
    createdAt: Date.now().toString(),
  };

  await redis.hSet(roomKey(roomId), room);
  await redis.expire(roomKey(roomId), ROOM_TTL);

  return roomId;
}

module.exports = { 
  createRoom, 
  getRoom, 
  listPublicRooms, 
  joinRoom, 
  leaveRoom, 
  markDisconnected, 
  markReconnected,
  findActiveRoomByUserId,
  findAdminRoomsByUserId,
  transferAdmin,
  updateRoomMetadata,
  deleteRoom,
  createSoloRoom
};
