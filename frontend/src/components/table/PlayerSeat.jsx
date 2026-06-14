"use client";
import { useState, useEffect } from "react";
import clsx from "clsx";

export default function PlayerSeat({ player, isYou = false, isTurn = false, onAvatarClick, className = "" }) {
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (!isTurn) {
      setTimeLeft(10);
      return;
    }
    if (player?.isBot) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isTurn, player?.isBot]);

  if (isYou) {
    // Bottom player (Me) - only avatar image
    return (
      <div 
        onClick={() => player && onAvatarClick && onAvatarClick(player.userId)}
        className={clsx(
          "w-12 h-12 rounded-full border-2 overflow-hidden shadow-lg transition-all",
          player && "cursor-pointer hover:opacity-90",
          isTurn ? "border-yellow-400 ring-4 ring-yellow-400/50 scale-105" : "border-slate-600 bg-slate-800",
          className
        )}
      >
        {player?.avatarUrl ? (
          <img src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
        ) : player ? (
          <div className="w-full h-full flex items-center justify-center text-white font-bold bg-slate-800 text-lg">
            {player.username?.[0]?.toUpperCase()}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-800 text-lg">
            ?
          </div>
        )}
      </div>
    );
  }

  // Opponents / Partner (Top, Left, Right) - simple avatar + name below
  return (
    <div className={clsx("flex flex-col items-center select-none w-20", className)}>
      <div 
        onClick={() => player && !player.isBot && onAvatarClick && onAvatarClick(player.userId)}
        className={clsx(
          "w-12 h-12 rounded-full border-2 overflow-hidden shadow-lg transition-all",
          player && !player.isBot && "cursor-pointer hover:opacity-90",
          isTurn ? "border-yellow-400 ring-4 ring-yellow-400/50 scale-105" : "border-slate-700 bg-slate-800"
        )}
      >
        {player?.avatarUrl ? (
          <img src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
        ) : player ? (
          <div className="w-full h-full flex items-center justify-center text-white font-bold bg-slate-800 text-lg">
            {player.username?.[0]?.toUpperCase()}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-800 text-lg">
            ?
          </div>
        )}
      </div>
      {player && (
        <span className="text-white text-[11px] font-bold mt-1 text-center truncate w-full drop-shadow-md">
          {player.username.substring(0, 20)}
          {player.isBot && <span className="text-[9px] text-slate-400 ml-0.5">[B]</span>}
          {isTurn && !player.isBot && <span className="text-yellow-400 ml-0.5">({timeLeft}s)</span>}
        </span>
      )}
    </div>
  );
}
