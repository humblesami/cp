const { getRedis } = require("./client");

function gameKey(roomId) { return `game:${roomId}`; }

async function saveGameState(roomId, state) {
  const redis = getRedis();
  await redis.set(gameKey(roomId), JSON.stringify(state), { EX: 60 * 60 * 3 });
}

async function getGameState(roomId) {
  const redis = getRedis();
  const raw = await redis.get(gameKey(roomId));
  return raw ? JSON.parse(raw) : null;
}

async function deleteGameState(roomId) {
  const redis = getRedis();
  await redis.del(gameKey(roomId));
}

module.exports = { saveGameState, getGameState, deleteGameState };
