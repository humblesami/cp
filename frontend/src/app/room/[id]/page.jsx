"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocketStore } from "../../../store/socketStore";
import { useSocket } from "../../../hooks/useSocket";
import PlayerStatsModal from "../../../components/ui/PlayerStatsModal";

export default function RoomPage() {
  const { id: roomId } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { 
    connected, joinRoom, leaveRoom, sendChat, roomPlayers, chatMessages, 
    notification, gamePhase, roomName, roomDescription, roomAdminId,
    updateRoom, transferAdmin, kickPlayer 
  } = useSocketStore();
  const [chatInput, setChatInput] = useState("");
  const [joined, setJoined] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useSocket();

  // Join room once socket is connected
  useEffect(() => {
    if (!connected || joined) return;
    joinRoom(roomId).then((res) => {
      if (!res.ok) {
        alert(res.error === "ROOM_FULL" ? "Room is full." : res.error);
        router.push("/");
      } else {
        setJoined(true);
      }
    });
  }, [connected, joined, roomId]);

  // Sync edits
  useEffect(() => {
    if (roomName) setEditName(roomName);
  }, [roomName]);

  useEffect(() => {
    if (roomDescription) setEditDescription(roomDescription);
  }, [roomDescription]);

  // Redirect to game when it starts
  useEffect(() => {
    if (gamePhase) {
      router.push(`/game/${roomId}`);
    }
  }, [gamePhase]);

  // Countdown display
  useEffect(() => {
    if (notification?.startsWith("Game starting")) {
      setCountdown(3);
    } else {
      setCountdown(null);
    }
  }, [notification]);

  async function handleLeave() {
    await leaveRoom();
    router.push("/");
  }

  async function handleUpdateRoom() {
    const res = await updateRoom(editName, editDescription);
    if (!res.ok) alert("Failed to update room settings: " + res.error);
  }

  async function handleKick(targetUserId) {
    if (confirm("Are you sure you want to kick this player?")) {
      const res = await kickPlayer(targetUserId);
      if (!res.ok) alert("Failed to kick player: " + res.error);
    }
  }

  async function handleSendChat(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const res = await sendChat(chatInput);
    if (res.ok) {
      setChatInput("");
    }
  }

  async function handleTransferAdmin(targetUserId) {
    if (confirm("Are you sure you want to make this player the table admin? You will forfeit admin control.")) {
      const res = await transferAdmin(targetUserId);
      if (!res.ok) alert("Failed to transfer admin: " + res.error);
    }
  }

  if (!connected || !joined) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-850">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
        <p className="text-sm font-bold tracking-wider animate-pulse text-emerald-700 uppercase">
          Connecting to room…
        </p>
      </div>
    );
  }

  const filledSeats = Array.from({ length: 4 }, (_, i) => roomPlayers[i] || null);
  const playerCount = roomPlayers.filter(Boolean).length;
  const isChatActive = playerCount >= 2;
  const isAdmin = roomAdminId && session?.userId && parseInt(roomAdminId) === parseInt(session.userId);

  return (
    <main className="h-screen w-screen bg-slate-50 text-slate-800 flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="h-12 flex-shrink-0 flex items-center justify-between border-b border-slate-200 pb-2 z-10">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-800">{roomName || "Waiting Room"}</h1>
          <p className="text-slate-500 text-xs">
            Room Code: <span className="font-mono font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">{roomId}</span>
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-slate-400 text-xs font-bold">{connected ? "🟢 Connected" : "🔴 Reconnecting"}</span>
          <button onClick={handleLeave} className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition">
            Leave Room
          </button>
        </div>
      </div>

      {/* Main Grid: Left side details, Right side chat */}
      <div className="flex-1 flex gap-4 mt-3 overflow-hidden">
        
        {/* Left Side: Admin + Seating */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
          {/* Admin Settings Panel */}
          {isAdmin && (
            <section className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col gap-2.5">
              <h2 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Room Settings (Admin)</h2>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
                  placeholder="Table Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={40}
                />
                <button
                  onClick={handleUpdateRoom}
                  className="bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg text-xs hover:bg-emerald-700 transition"
                >
                  Save Details
                </button>
              </div>
              <textarea
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 text-xs h-10 resize-none placeholder-slate-400"
                placeholder="Room Description / Rules (max 255 chars)…"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={255}
              />
            </section>
          )}

          {/* Description for non-admins */}
          {!isAdmin && roomDescription && (
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
              <h2 className="text-slate-800 font-bold text-xs">Description & Rules</h2>
              <p className="text-slate-600 text-xs mt-1 italic whitespace-pre-wrap">{roomDescription}</p>
            </div>
          )}

          {/* Seats */}
          <section className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex-1 flex flex-col">
            <h2 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2.5">Players ({playerCount}/4)</h2>
            <div className="grid grid-cols-2 gap-2.5 flex-1 items-center">
              {filledSeats.map((player, idx) => (
                <SeatCard 
                  key={idx} 
                  seat={idx} 
                  player={player} 
                  isYou={player?.userId === session?.userId} 
                  isAdmin={isAdmin}
                  onAvatarClick={setSelectedPlayerId} 
                  onKick={handleKick}
                  onTransferAdmin={handleTransferAdmin}
                />
              ))}
            </div>
          </section>

          {/* Countdown overlay */}
          {countdown && (
            <div className="bg-emerald-600 border border-emerald-500 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-sm animate-pulse">🃏 Game starting in {countdown}…</p>
            </div>
          )}
        </div>

        {/* Right Side: Chat Panel */}
        <section className="w-72 flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-3.5 py-2 border-b border-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">Chat</div>
          <div className="flex-1 overflow-y-auto px-3.5 py-2 flex flex-col gap-1">
            {chatMessages.length === 0 && (
              <p className="text-slate-400 text-xs text-center mt-4">No messages yet</p>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className="text-xs">
                <span className="text-emerald-700 font-bold">{msg.username}: </span>
                <span className="text-slate-700">{msg.message}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="p-2.5 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder={isChatActive ? "Type a message…" : "Needs 2+ players"}
              disabled={!isChatActive}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              maxLength={200}
            />
            <button
              type="submit"
              disabled={!isChatActive || !chatInput.trim()}
              className="bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg text-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>

      </div>

      {/* Selected player stats popup */}
      {selectedPlayerId && (
        <PlayerStatsModal
          userId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </main>
  );
}

function SeatCard({ seat, player, isYou, isAdmin, onAvatarClick, onKick, onTransferAdmin }) {
  const teamLabel = seat % 2 === 0 ? "Team A" : "Team B";
  const teamColor = seat % 2 === 0 ? "text-blue-600" : "text-rose-600";

  return (
    <div 
      className={`rounded-xl border p-2.5 flex items-center justify-between select-none ${player && !player.isBot ? "bg-slate-50 border-slate-200 shadow-sm" : "bg-slate-100 border-dashed border-slate-300"}`}
    >
      <div 
        onClick={() => player && !player.isBot && onAvatarClick && onAvatarClick(player.userId)}
        className={`flex items-center gap-2.5 min-w-0 ${player && !player.isBot ? "cursor-pointer hover:opacity-80 transition" : ""}`}
      >
        <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-sm font-bold text-slate-700 overflow-hidden flex-shrink-0">
          {player?.avatarUrl ? (
            <img src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
          ) : player ? (
            player.username[0].toUpperCase()
          ) : (
            <span className="text-slate-400 font-normal">?</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-slate-800 text-xs font-bold truncate">
            {player ? player.username : "Empty seat"}
            {isYou && <span className="ml-1 text-[10px] text-emerald-600">(you)</span>}
          </p>
          <p className={`text-[10px] font-semibold ${teamColor}`}>{teamLabel} · Seat {seat + 1}</p>
        </div>
      </div>

      {/* Admin Actions */}
      {isAdmin && player && !player.isBot && !isYou && (
        <div className="flex gap-1 flex-shrink-0 ml-1.5">
          <button 
            title="Make Admin"
            onClick={(e) => {
              e.stopPropagation();
              onTransferAdmin(player.userId);
            }} 
            className="text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-1.5 py-0.5 rounded transition text-center"
          >
            Admin
          </button>
          <button 
            title="Kick Player"
            onClick={(e) => {
              e.stopPropagation();
              onKick(player.userId);
            }} 
            className="text-[9px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-1.5 py-0.5 rounded transition text-center"
          >
            Kick
          </button>
        </div>
      )}
    </div>
  );
}
