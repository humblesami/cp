"use client";
import { useState, useEffect } from "react";
import clsx from "clsx";
import PlayingCard from "./PlayingCard";

export default function PlayerSeat({ seat, player, cardCount = 0, isYou = false, isTurn = false, trickCard = null, position, onAvatarClick }) {
  const teamLabel = seat % 2 === 0 ? "A" : "B";
  
  // High contrast Team tags for dark starburst background
  const teamTagColor = seat % 2 === 0 
    ? "border-amber-500/40 text-amber-300 bg-amber-500/10" 
    : "border-blue-400/40 text-blue-300 bg-blue-500/10";
  
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

  // Played card is positioned next to the avatar horizontally (left vs right sides)
  const positionStyles = {
    bottom: "flex-row items-center gap-3",
    top: "flex-row items-center gap-3",
    left: "flex-row items-center gap-3",
    right: "flex-row-reverse items-center gap-3",
  };

  return (
    <div className={clsx("flex", positionStyles[position])}>
      {/* Avatar + Name Panel */}
      <div 
        onClick={() => player && !player.isBot && onAvatarClick && onAvatarClick(player.userId)}
        className={clsx(
          "flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all select-none w-28",
          player && !player.isBot && "cursor-pointer hover:bg-slate-700/50",
          isTurn 
            ? "border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/20 scale-105" 
            : "border-slate-700 bg-slate-900/90",
          isYou && "ring-2 ring-white/30"
        )}
      >
        <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-lg overflow-hidden shadow-inner bg-slate-800">
          {player?.avatarUrl ? (
            <img src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
          ) : player ? (
            <span className="text-white font-bold">{player.username?.[0]?.toUpperCase()}</span>
          ) : (
            <span className="text-slate-500 text-2xl">?</span>
          )}
        </div>
        
        <p className="text-white text-xs font-bold text-center max-w-[90px] truncate">
          {player ? player.username : "Empty"}
          {isYou && <span className="text-amber-400 ml-1">★</span>}
          {player?.isBot && <span className="text-slate-400 ml-1">[bot]</span>}
        </p>

        <span className={clsx("text-[9px] font-black border rounded px-1.5 py-0.5 tracking-wider uppercase", teamTagColor)}>
          Team {teamLabel}
        </span>

        {/* Card count for opponents */}
        {!isYou && player && (
          <span className="text-slate-400 text-[10px] font-medium">{cardCount} cards</span>
        )}

        {/* Turn indicator */}
        {isTurn && (
          <span className="text-yellow-400 text-[10px] font-black animate-pulse">
            {player?.isBot ? "▶ BOT" : `▶ ${timeLeft}s`}
          </span>
        )}
      </div>

      {/* Played card */}
      {trickCard !== undefined && trickCard !== null && (
        <div className="relative transform hover:scale-105 transition-transform duration-200">
          <PlayingCard card={trickCard} small={true} />
        </div>
      )}
    </div>
  );
}
