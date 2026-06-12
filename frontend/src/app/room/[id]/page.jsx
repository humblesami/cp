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
        router.push("/lobby");
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
      const t = setInterval(() => setCountdown((c) => (c > 1 ? c - 1 : null)), 1000);
      return () => clearInterval(t);
    }
  }, [notification]);

  function handleLeave() {
    leaveRoom();
    router.push("/lobby");
  }

  function handleChat(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChat(chatInput.trim());
    setChatInput("");
  }

  async function handleUpdateRoom() {
    if (!editName.trim()) return;
    const res = await updateRoom(editName.trim(), editDescription.trim());
    if (!res.ok) {
      alert("Failed to update room settings: " + res.error);
    }
  }

  async function handleKick(targetUserId) {
    if (confirm("Are you sure you want to kick this player from the table?")) {
      const res = await kickPlayer(targetUserId);
      if (!res.ok) alert("Failed to kick player: " + res.error);
    }
  }

  async function handleTransferAdmin(targetUserId) {
    if (confirm("Are you sure you want to make this player the table admin? You will forfeit admin control.")) {
      const res = await transferAdmin(targetUserId);
      if (!res.ok) alert("Failed to transfer admin: " + res.error);
    }
  }

  const filledSeats = Array.from({ length: 4 }, (_, i) => roomPlayers[i] || null);
  const playerCount = roomPlayers.filter(Boolean).length;
  const isChatActive = playerCount >= 2;
  const isAdmin = roomAdminId && session?.userId && parseInt(roomAdminId) === parseInt(session.userId);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gold">Waiting Room</h1>
        <div className="flex gap-3 items-center">
          <span className="text-slate-400 text-sm">{connected ? "🟢" : "🔴"}</span>
          <button onClick={handleLeave} className="bg-red-700 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm transition">
            Leave Room
          </button>
        </div>
      </div>

      {/* Room code and info */}
      <div className="flex flex-col gap-2">
        <p className="text-slate-400 text-sm">
          Room Code: <span className="font-mono text-white bg-slate-700 px-2 py-0.5 rounded">{roomId}</span>
          <span className="ml-2 text-slate-500">— share this code to invite friends</span>
        </p>

        {/* Room description display for players */}
        {!isAdmin && (
          <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 mt-1">
            <h2 className="text-white text-sm font-semibold">{roomName || "Court Piece Table"}</h2>
            {roomDescription && (
              <p className="text-slate-400 text-xs mt-1 italic whitespace-pre-wrap">{roomDescription}</p>
            )}
          </div>
        )}
      </div>

      {/* Admin Settings Panel */}
      {isAdmin && (
        <section className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col gap-3">
          <h2 className="text-slate-300 font-semibold text-sm">Room Settings (Admin)</h2>
          <div className="flex gap-3">
            <input
              className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-gold text-sm placeholder-slate-500"
              placeholder="Table Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={40}
            />
            <button
              onClick={handleUpdateRoom}
              className="bg-gold text-slate-900 font-bold px-4 py-1.5 rounded-lg text-xs hover:bg-yellow-400 transition"
            >
              Save Details
            </button>
          </div>
          <textarea
            className="bg-slate-700 text-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-gold text-xs h-14 resize-none placeholder-slate-500"
            placeholder="Room Description / Rules (max 255 chars)…"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            maxLength={255}
          />
        </section>
      )}

      {/* Seats */}
      <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <h2 className="text-slate-300 font-medium mb-4">Players ({playerCount}/4)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        <div className="bg-green-800 border border-green-600 rounded-xl p-4 text-center">
          <p className="text-green-300 font-bold text-lg">🃏 Game starting in {countdown}…</p>
        </div>
      )}

      {/* Chat */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col" style={{ height: 280 }}>
        <div className="px-4 py-2 border-b border-slate-700 text-slate-400 text-sm font-medium">Chat</div>
        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1">
          {chatMessages.length === 0 && (
            <p className="text-slate-600 text-sm text-center mt-4">No messages yet</p>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className="text-sm">
              <span className="text-gold font-medium">{msg.username}: </span>
              <span className="text-slate-200">{msg.message}</span>
            </div>
          ))}
        </div>
        <form onSubmit={handleChat} className="flex border-t border-slate-700">
          <input
            className="flex-1 bg-transparent text-white px-4 py-2 text-sm outline-none placeholder-slate-600 disabled:opacity-50"
            placeholder={isChatActive ? "Type here…" : "Chat disabled: Minimum 2 players required"}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={!isChatActive}
            maxLength={200}
          />
          <button 
            type="submit" 
            className="px-4 text-gold font-medium text-sm hover:text-yellow-300 transition disabled:opacity-40 disabled:hover:text-gold"
            disabled={!isChatActive}
          >
            Send
          </button>
        </form>
      </section>

      {/* Player Stats Popup */}
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
  const teamColor = seat % 2 === 0 ? "text-blue-400" : "text-red-400";

  return (
    <div 
      className={`rounded-xl border p-3 flex items-center justify-between select-none ${player && !player.isBot ? "bg-slate-700 border-slate-600" : "bg-slate-900 border-dashed border-slate-700"}`}
    >
      <div 
        onClick={() => player && !player.isBot && onAvatarClick && onAvatarClick(player.userId)}
        className={`flex items-center gap-3 min-w-0 ${player && !player.isBot ? "cursor-pointer hover:opacity-85 transition" : ""}`}
      >
        <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
          {player?.avatarUrl ? (
            <img src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
          ) : player ? (
            player.username[0].toUpperCase()
          ) : (
            <span className="text-slate-500">?</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {player ? player.username : "Waiting…"}
            {isYou && <span className="ml-1 text-xs text-gold">(you)</span>}
          </p>
          <p className={`text-xs ${teamColor}`}>{teamLabel} · Seat {seat + 1}</p>
        </div>
      </div>

      {/* Admin Actions */}
      {isAdmin && player && !player.isBot && !isYou && (
        <div className="flex gap-1.5 flex-shrink-0 ml-2">
          <button 
            title="Make Admin"
            onClick={(e) => {
              e.stopPropagation();
              onTransferAdmin(player.userId);
            }} 
            className="text-[10px] bg-gold hover:bg-yellow-400 text-slate-900 font-bold px-2 py-1 rounded transition text-center"
          >
            Admin
          </button>
          <button 
            title="Kick Player"
            onClick={(e) => {
              e.stopPropagation();
              onKick(player.userId);
            }} 
            className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-bold px-2 py-1 rounded transition text-center"
          >
            Kick
          </button>
        </div>
      )}
    </div>
  );
}
