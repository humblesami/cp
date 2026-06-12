const express = require("express");
const router = express.Router();
const { listPublicRooms, getRoom } = require("../redis/rooms");

// GET /api/rooms - list all public rooms for lobby
router.get("/", async (req, res) => {
  try {
    const rooms = await listPublicRooms();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/:id
router.get("/:id", async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    // Don't expose seat details to non-members via REST
    res.json({ id: room.id, name: room.name, status: room.status, playerCount: Object.values(room.seats).filter(Boolean).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
