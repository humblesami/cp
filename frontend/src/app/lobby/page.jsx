"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocketStore } from "../../store/socketStore";
import { useSocket } from "../../hooks/useSocket";

export default function LobbyPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { connected, createRoom, joinRoom, checkActiveGame, joinLobby, sendLobbyChat, lobbyMessages, createSoloRoom } = useSocketStore();
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [lobbyChatInput, setLobbyChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const chatEndRef = useRef(null);

  useSocket(); // initialize socket

  // Check for active game to reconnect
  useEffect(() => {
    if (!connected) return;
    async function checkReconnect() {
      const res = await checkActiveGame();
      if (res?.ok && res.inGame) {
        if (res.status === "in_progress") {
          router.push(`/game/${res.roomId}`);
        } else {
          router.push(`/room/${res.roomId}`);
        }
      }
    }
    checkReconnect();
  }, [connected]);

  // Join lobby chat room once socket is connected
  useEffect(() => {
    if (connected) {
      joinLobby();
    }
  }, [connected]);

  // Poll room list every 3 seconds
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/rooms`);
        const data = await res.json();
        setRooms(data);
      } catch { }
    };
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll chat to bottom
  useEffect(() => {
    // chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lobbyMessages]);

  async function handleCreateSoloRoom() {
    if (!connected) {
      setError("Not connected to the game server. Please ensure the game server is running on port 3001.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await createSoloRoom();
    setLoading(false);
    if (res.ok) {
      router.push(`/game/${res.roomId}`);
    } else {
      setError(res.error || "Failed to start solo game");
    }
  }

  async function handleCreateRoom() {
    if (!newRoomName.trim()) {
      setError("Please enter a room name.");
      return;
    }
    if (!connected) {
      setError("Not connected to the game server. Please ensure the game server is running on port 3001.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await createRoom(newRoomName.trim(), newRoomDescription.trim(), isPrivate);
    setLoading(false);
    if (res.ok) {
      router.push(`/room/${res.roomId}`);
    } else {
      setError(res.error || "Failed to create room");
    }
  }

  async function handleJoinPrivateRoom() {
    if (!joinCode.trim()) {
      setError("Please enter a room code.");
      return;
    }
    if (!connected) {
      setError("Not connected to the game server. Please ensure the game server is running on port 3001.");
      return;
    }
    setError("");
    await handleJoinRoom(joinCode.trim());
  }

  async function handleJoinRoom(roomId) {
    if (!connected) {
      setError("Not connected to the game server. Please ensure the game server is running on port 3001.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await joinRoom(roomId);
    setLoading(false);
    if (res.ok) {
      router.push(`/room/${roomId}`);
    } else {
      setError(res.error === "ROOM_FULL" ? "That room is full." : res.error || "Could not join");
    }
  }

  function handleSendLobbyChat(e) {
    e.preventDefault();
    if (!lobbyChatInput.trim()) return;
    sendLobbyChat(lobbyChatInput.trim());
    setLobbyChatInput("");
  }

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto text-slate-800">
      <header className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-emerald-700">♠ Court Piece</h1>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs font-bold">
            {connected ? "🟢 Connected" : "🔴 Reconnecting…"}
          </span>
          <span className="text-slate-800 font-bold text-sm">{session?.user?.name}</span>
          {session?.user?.image && (
            <img src={session.user.image} className="w-8 h-8 rounded-full border border-slate-200" alt="avatar" />
          )}
        </div>
      </header>

      {/* Main Grid: Left Column for room creation/lists, Right Column for Lobby Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Create/Join & Room List (span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Practice Mode / Play Solo */}
          <section className="bg-gradient-to-r from-emerald-600/10 to-teal-500/5 rounded-xl p-5 border border-emerald-500/20 flex items-center justify-between shadow-sm">
            <div>
              <h2 className="text-slate-800 font-bold text-base">Practice Mode</h2>
              <p className="text-slate-600 text-xs mt-1">Play instantly with 3 intelligent bots. No setup required.</p>
            </div>
            <button
              onClick={handleCreateSoloRoom}
              disabled={loading}
              className="bg-emerald-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition shrink-0 text-sm shadow-sm"
            >
              Play Solo
            </button>
          </section>

          {/* Create Room */}
          <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h2 className="text-slate-800 font-bold text-base mb-3">Create a Room</h2>
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex gap-3">
                <input
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
                  placeholder="Room name (e.g. Sami's Table)"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
                  maxLength={40}
                />
                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="bg-emerald-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition text-sm shadow-sm"
                >
                  {loading ? "…" : "Create"}
                </button>
              </div>
              <textarea
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400 text-xs h-16 resize-none"
                placeholder="Room description / rules (max 255 chars)…"
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
              <input
                type="checkbox"
                id="isPrivate"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-emerald-600"
              />
              <label htmlFor="isPrivate">Private Room (Hide from public list)</label>
            </div>
            {error && <p className="text-rose-600 text-xs font-bold mt-2">{error}</p>}
          </section>

          {/* Join Private Room */}
          <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h2 className="text-slate-800 font-bold text-base mb-3">Join via Code</h2>
            <div className="flex gap-3">
              <input
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400 uppercase font-mono text-sm tracking-wider"
                placeholder="Enter Room Code (e.g. ABC12)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinPrivateRoom()}
                maxLength={10}
              />
              <button
                onClick={handleJoinPrivateRoom}
                disabled={loading || !joinCode.trim()}
                className="bg-slate-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition text-sm shadow-sm"
              >
                {loading ? "…" : "Join"}
              </button>
            </div>
          </section>

          {/* Room List */}
          <section>
            <h2 className="text-slate-800 font-bold text-base mb-3">
              Open Rooms <span className="text-slate-400 font-normal text-sm">({rooms.length})</span>
            </h2>
            {rooms.length === 0 ? (
              <p className="text-slate-400 text-center py-12 text-sm bg-white rounded-xl border border-slate-200">No rooms yet — be the first to create one.</p>
            ) : (
              <div className="grid gap-3">
                {rooms.map((room) => (
                  <RoomCard key={room.id} room={room} onJoin={() => handleJoinRoom(room.id)} loading={loading} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Side: Lobby Chat / Announcements */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 flex flex-col h-[550px] overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-0.5">
            <h2 className="text-slate-800 font-bold text-sm">Lobby Announcements</h2>
            <p className="text-[10px] text-slate-500">Official updates and public lobby chat</p>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {lobbyMessages.length === 0 && (
              <p className="text-slate-400 text-xs text-center mt-12">No messages in lobby yet</p>
            )}
            {lobbyMessages.map((msg, idx) => {
              const isMod = msg.role === "moderator";
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg text-xs transition ${isMod
                      ? "bg-amber-50 border-l-4 border-amber-500 text-amber-900"
                      : "bg-slate-50 border border-slate-100 text-slate-800"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">{msg.username}</span>
                      {isMod && (
                        <span className="bg-amber-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Mod
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="break-all whitespace-pre-wrap">{msg.message}</p>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Form Input */}
          <form onSubmit={handleSendLobbyChat} className="flex border-t border-slate-100 p-2 gap-2 bg-slate-50">
            <input
              className="flex-1 bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
              placeholder="Type lobby message…"
              value={lobbyChatInput}
              onChange={(e) => setLobbyChatInput(e.target.value)}
              maxLength={200}
            />
            <button
              type="submit"
              className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
              disabled={!lobbyChatInput.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function RoomCard({ room, onJoin, loading }) {
  const statusColor = {
    waiting: "text-emerald-600",
    in_progress: "text-amber-600",
    finished: "text-slate-400",
  }[room.status] || "text-slate-500";

  const canJoin = room.status === "waiting" && room.playerCount < 4;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-slate-300 transition shadow-sm">
      <div>
        <p className="text-slate-800 font-bold text-sm">{room.name}</p>
        {room.description && (
          <p className="text-slate-500 text-xs mt-1 italic max-w-md line-clamp-2">{room.description}</p>
        )}
        <p className={`text-xs font-semibold ${statusColor} capitalize mt-1`}>
          {room.status.replace("_", " ")} · {room.playerCount}/4 players
        </p>
      </div>
      <button
        onClick={onJoin}
        disabled={!canJoin || loading}
        className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs shadow-sm"
      >
        {canJoin ? "Join" : room.playerCount >= 4 ? "Full" : "In Progress"}
      </button>
    </div>
  );
}
