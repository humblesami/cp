"use client";
import { motion } from "framer-motion";
import clsx from "clsx";

const SUIT_SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_COLORS = { S: "text-slate-900", H: "text-red-600", D: "text-red-600", C: "text-slate-900" };
const RANK_DISPLAY = { T: "10", J: "J", Q: "Q", K: "K", A: "A" };

export default function PlayingCard({ card, faceDown = false, playable = false, onClick, small = false, className = "" }) {
  const rank = card ? (RANK_DISPLAY[card[0]] || card[0]) : null;
  const suit = card ? card[1] : null;
  const suitSymbol = suit ? SUIT_SYMBOLS[suit] : null;
  const suitColor = suit ? SUIT_COLORS[suit] : "";

  const base = clsx(
    "rounded-lg border select-none flex-shrink-0",
    small ? "w-10 h-14 text-xs" : "w-16 h-24 text-sm",
    playable && "card-playable ring-2 ring-yellow-400",
    !playable && !faceDown && "opacity-90",
    className
  );

  if (faceDown) {
    return (
      <motion.div
        layout
        className={clsx(base, "bg-blue-800 border-blue-600 flex items-center justify-center")}
      >
        <span className="text-blue-400 text-lg">🂠</span>
      </motion.div>
    );
  }

  if (!card) {
    // Empty slot placeholder
    return (
      <div className={clsx(base, "bg-transparent border-dashed border-slate-600 opacity-30")} />
    );
  }

  return (
    <motion.div
      layout
      whileHover={playable ? { y: -10 } : {}}
      whileTap={playable ? { scale: 0.95 } : {}}
      onClick={playable ? onClick : undefined}
      className={clsx(base, "bg-white border-gray-200 cursor-pointer flex flex-col justify-between p-1")}
    >
      <div className={clsx("font-bold leading-none", suitColor, small ? "text-xs" : "text-sm")}>
        <div>{rank}</div>
        <div>{suitSymbol}</div>
      </div>
      {!small && (
        <div className={clsx("font-bold leading-none rotate-180", suitColor, "text-sm self-end")}>
          <div>{rank}</div>
          <div>{suitSymbol}</div>
        </div>
      )}
    </motion.div>
  );
}
