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
  const { connected, joinRoom, leaveRoom, sendChat, roomPlayers, chatMessages, notification, gamePhase } = useSocketStore();
  const [chatInput, setChatInput] = useState("");
  const [joined, setJoined] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

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

  const filledSeats = Array.from({ length: 4 }, (_, i) => roomPlayers[i] || null);

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

      {/* Room code */}
      <p className="text-slate-400 text-sm">
        Room: <span className="font-mono text-white bg-slate-700 px-2 py-0.5 rounded">{roomId}</span>
        <span className="ml-2 text-slate-500">— share this code to invite friends</span>
      </p>

      {/* Seats */}
      <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <h2 className="text-slate-300 font-medium mb-4">Players ({filledSeats.filter(Boolean).length}/4)</h2>
        <div className="grid grid-cols-2 gap-3">
          {filledSeats.map((player, idx) => (
            <SeatCard key={idx} seat={idx} player={player} isYou={player?.userId === session?.userId} onAvatarClick={setSelectedPlayerId} />
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
            className="flex-1 bg-transparent text-white px-4 py-2 text-sm outline-none placeholder-slate-600"
            placeholder="Type here…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            maxLength={200}
          />
          <button type="submit" className="px-4 text-gold font-medium text-sm hover:text-yellow-300 transition">
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

function SeatCard({ seat, player, isYou, onAvatarClick }) {
  const teamLabel = seat % 2 === 0 ? "Team A" : "Team B";
  const teamColor = seat % 2 === 0 ? "text-blue-400" : "text-red-400";

  return (
    <div 
      onClick={() => player && !player.isBot && onAvatarClick && onAvatarClick(player.userId)}
      className={`rounded-xl border p-3 flex items-center gap-3 select-none ${player && !player.isBot ? "bg-slate-700 border-slate-600 cursor-pointer hover:bg-slate-600/70 transition" : "bg-slate-900 border-dashed border-slate-700"}`}
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
  );
}
