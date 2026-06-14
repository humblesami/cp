const { 
  createRoom, 
  getRoom, 
  joinRoom, 
  leaveRoom, 
  findAdminRoomsByUserId 
} = require("../src/redis/rooms");
const { getRedis } = require("../src/redis/client");

jest.mock("../src/redis/client", () => {
  const store = {};
  const mockClient = {
    hSet: jest.fn(async (key, fields) => {
      if (!store[key]) store[key] = {};
      for (const [k, v] of Object.entries(fields)) {
        store[key][k] = String(v);
      }
    }),
    hGetAll: jest.fn(async (key) => {
      // Return a copy to prevent mutation of the store by caller (e.g. JSON.parse on seats)
      return store[key] ? { ...store[key] } : {};
    }),
    keys: jest.fn(async (pattern) => {
      const regex = new RegExp("^" + pattern.replace("*", ".*") + "$");
      return Object.keys(store).filter((k) => regex.test(k));
    }),
    del: jest.fn(async (key) => {
      delete store[key];
    }),
    expire: jest.fn(async (key, ttl) => {}),
    set: jest.fn(async (key, value, options) => {
      if (options?.NX) {
        if (store[key] !== undefined) return null;
        store[key] = String(value);
        return "OK";
      }
      store[key] = String(value);
      return "OK";
    }),
    clearStore: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    }
  };
  return {
    getRedis: () => mockClient,
    initRedis: async () => mockClient,
  };
});

describe("Room management and admin transfer", () => {
  beforeEach(() => {
    getRedis().clearStore();
  });

  test("creates room and marks creator as admin in room seats", async () => {
    const roomId = await createRoom({
      name: "Test Room",
      createdByUserId: 1,
      createdByUsername: "User1",
    });
    
    expect(roomId).toBeDefined();
    const room = await getRoom(roomId);
    expect(room.id).toBe(roomId);
    expect(String(room.createdBy)).toBe("1");
    expect(room.seats[0].userId).toBe(1);
    expect(room.seats[1]).toBeNull();
  });

  test("leaving the room when it's empty deletes the room", async () => {
    const roomId = await createRoom({
      name: "Test Room",
      createdByUserId: 1,
      createdByUsername: "User1",
    });

    const result = await leaveRoom(roomId, 1, true);
    expect(result.deleted).toBe(true);

    const room = await getRoom(roomId);
    expect(room).toBeNull();

    const adminRooms = await findAdminRoomsByUserId(1);
    expect(adminRooms).toHaveLength(0);
  });

  test("leaving the room when other players are present transfers admin", async () => {
    // 1. Creator creates room
    const roomId = await createRoom({
      name: "Test Room",
      createdByUserId: 1,
      createdByUsername: "User1",
    });

    // 2. Another player joins
    await joinRoom(roomId, 2, "User2");

    // Verify creator is admin and 2 players in room
    let room = await getRoom(roomId);
    expect(String(room.createdBy)).toBe("1");
    expect(Object.values(room.seats).filter(Boolean)).toHaveLength(2);

    // 3. Creator leaves room
    const result = await leaveRoom(roomId, 1, true);
    expect(result.deleted).toBe(false);
    expect(result.playerCount).toBe(1);
    expect(result.newAdminId).toBe(2);
    expect(result.newAdminUsername).toBe("User2");

    // 4. Verify in database that creator is no longer admin, and User2 is
    room = await getRoom(roomId);
    expect(String(room.createdBy)).toBe("2");
    expect(room.seats[0]).toBeNull(); // Creator's seat is now empty
    expect(room.seats[1].userId).toBe(2); // User2 remains

    // 5. Verify findAdminRoomsByUserId for User1 is empty, but for User2 has the room
    const adminRooms1 = await findAdminRoomsByUserId(1);
    expect(adminRooms1).toHaveLength(0);

    const adminRooms2 = await findAdminRoomsByUserId(2);
    expect(adminRooms2).toHaveLength(1);
    expect(adminRooms2[0].id).toBe(roomId);
  });
});
