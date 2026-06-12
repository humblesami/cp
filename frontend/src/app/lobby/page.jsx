"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocketStore } from "../../store/socketStore";
import { useSocket } from "../../hooks/useSocket";

export default function LobbyPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { connected, createRoom, joinRoom } = useSocketStore();
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useSocket(); // initialize socket

  // Poll room list every 3 seconds
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/rooms`);
        const data = await res.json();
        setRooms(data);
      } catch {}
    };
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreateRoom() {
    if (!newRoomName.trim()) return;
    setLoading(true);
    const res = await createRoom(newRoomName.trim(), isPrivate);
    setLoading(false);
    if (res.ok) {
      router.push(`/room/${res.roomId}`);
    } else {
      setError(res.error || "Failed to create room");
    }
  }

  async function handleJoinPrivateRoom() {
    if (!joinCode.trim()) return;
    await handleJoinRoom(joinCode.trim());
  }

  async function handleJoinRoom(roomId) {
    setLoading(true);
    const res = await joinRoom(roomId);
    setLoading(false);
    if (res.ok) {
      router.push(`/room/${roomId}`);
    } else {
      setError(res.error === "ROOM_FULL" ? "That room is full." : res.error || "Could not join");
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gold">♠ Court Piece</h1>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm">
            {connected ? "🟢 Connected" : "🔴 Connecting…"}
          </span>
          <span className="text-white font-medium">{session?.user?.name}</span>
          {session?.user?.image && (
            <img src={session.user.image} className="w-9 h-9 rounded-full" alt="avatar" />
          )}
        </div>
      </header>

      {/* Create Room */}
      <section className="bg-slate-800 rounded-xl p-5 mb-8 border border-slate-700">
        <h2 className="text-white font-semibold text-lg mb-3">Create a Room</h2>
        <div className="flex gap-3 mb-3">
          <input
            className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-gold placeholder-slate-500"
            placeholder="Room name (e.g. Sami's Table)"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
            maxLength={40}
          />
          <button
            onClick={handleCreateRoom}
            disabled={loading || !connected}
            className="bg-gold text-slate-900 font-bold px-6 py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition"
          >
            {loading ? "…" : "Create"}
          </button>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <input 
            type="checkbox" 
            id="isPrivate" 
            checked={isPrivate} 
            onChange={(e) => setIsPrivate(e.target.checked)} 
            className="w-4 h-4 rounded accent-gold"
          />
          <label htmlFor="isPrivate">Private Room (Hide from public list)</label>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </section>

      {/* Join Private Room */}
      <section className="bg-slate-800 rounded-xl p-5 mb-8 border border-slate-700">
        <h2 className="text-white font-semibold text-lg mb-3">Join via Code</h2>
        <div className="flex gap-3">
          <input
            className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-gold placeholder-slate-500 uppercase font-mono"
            placeholder="Enter Room Code (e.g. ABC12)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoinPrivateRoom()}
            maxLength={10}
          />
          <button
            onClick={handleJoinPrivateRoom}
            disabled={loading || !connected || !joinCode.trim()}
            className="bg-slate-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-slate-500 disabled:opacity-50 transition"
          >
            {loading ? "…" : "Join"}
          </button>
        </div>
      </section>

      {/* Room List */}
      <section>
        <h2 className="text-white font-semibold text-lg mb-3">
          Open Rooms <span className="text-slate-500 font-normal text-sm">({rooms.length})</span>
        </h2>
        {rooms.length === 0 ? (
          <p className="text-slate-500 text-center py-12">No rooms yet — be the first to create one.</p>
        ) : (
          <div className="grid gap-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onJoin={() => handleJoinRoom(room.id)} loading={loading} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function RoomCard({ room, onJoin, loading }) {
  const statusColor = {
    waiting: "text-green-400",
    in_progress: "text-yellow-400",
    finished: "text-slate-500",
  }[room.status] || "text-slate-400";

  const canJoin = room.status === "waiting" && room.playerCount < 4;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-white font-medium">{room.name}</p>
        <p className={`text-sm ${statusColor} capitalize`}>
          {room.status.replace("_", " ")} · {room.playerCount}/4 players
        </p>
      </div>
      <button
        onClick={onJoin}
        disabled={!canJoin || loading}
        className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm"
      >
        {canJoin ? "Join" : room.playerCount >= 4 ? "Full" : "In Progress"}
      </button>
    </div>
  );
}
