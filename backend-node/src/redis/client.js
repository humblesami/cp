const { createClient } = require("redis");

let client;

async function initRedis() {
  client = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
  client.on("error", (err) => console.error("Redis error:", err));
  await client.connect();
  console.log("Redis connected");
  return client;
}

function getRedis() {
  if (!client) throw new Error("Redis not initialized — call initRedis() first");
  return client;
}

module.exports = { initRedis, getRedis };
