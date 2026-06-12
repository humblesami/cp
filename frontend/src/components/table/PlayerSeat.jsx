"use client";
import { useState, useEffect } from "react";
import clsx from "clsx";
import PlayingCard from "./PlayingCard";

export default function PlayerSeat({ seat, player, cardCount = 0, isYou = false, isTurn = false, trickCard = null, position, onAvatarClick }) {
  const teamLabel = seat % 2 === 0 ? "A" : "B";
  const teamColor = seat % 2 === 0 ? "border-blue-500 text-blue-400" : "border-red-500 text-red-400";
  
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (!isTurn) {
      setTimeLeft(10);
      return;
    }
    if (player?.isBot) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTurn, player?.isBot]);

  const positionStyles = {
    bottom: "flex-col items-center",
    top: "flex-col-reverse items-center",
    left: "flex-row items-center gap-2",
    right: "flex-row-reverse items-center gap-2",
  };

  return (
    <div className={clsx("flex gap-2", positionStyles[position])}>
      {/* Avatar + Name */}
      <div 
        onClick={() => player && !player.isBot && onAvatarClick && onAvatarClick(player.userId)}
        className={clsx(
          "flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all select-none",
          player && !player.isBot && "cursor-pointer hover:bg-slate-700/50",
          isTurn ? "border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/20" : teamColor + " bg-slate-800/80",
          isYou && "ring-2 ring-white/30"
        )}
      >
        <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-lg overflow-hidden">
          {player?.avatarUrl ? (
            <img src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
          ) : player ? (
            <span className="text-white font-bold">{player.username?.[0]?.toUpperCase()}</span>
          ) : (
            <span className="text-slate-500 text-2xl">?</span>
          )}
        </div>
        <p className="text-white text-xs font-medium text-center max-w-[80px] truncate">
          {player ? player.username : "Empty"}
          {isYou && <span className="text-gold ml-1">★</span>}
          {player?.isBot && <span className="text-slate-400 ml-1">[bot]</span>}
        </p>
        <span className={clsx("text-xs font-bold border rounded px-1", teamColor)}>
          Team {teamLabel}
        </span>
        {/* Card count for opponents */}
        {!isYou && (
          <span className="text-slate-400 text-xs">{cardCount} cards</span>
        )}
        {/* Turn indicator */}
        {isTurn && (
          <span className="text-yellow-400 text-xs font-bold animate-pulse">
            {player?.isBot ? "▶ THINKING" : `▶ ${timeLeft}s`}
          </span>
        )}
      </div>

      {/* Trick card played by this seat */}
      {trickCard !== undefined && (
        <div className="relative">
          {trickCard ? (
            <PlayingCard card={trickCard} small={true} />
          ) : (
            <div className="w-20 h-28 rounded-xl border-dashed border-2 border-slate-700 opacity-30" />
          )}
        </div>
      )}
    </div>
  );
}
