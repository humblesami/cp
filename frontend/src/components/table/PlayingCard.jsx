"use client";
import { motion } from "framer-motion";
import clsx from "clsx";

const SUIT_SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_COLORS = { S: "text-slate-900", H: "text-red-600", D: "text-red-600", C: "text-slate-900" };
const RANK_DISPLAY = { T: "10", J: "J", Q: "Q", K: "K", A: "A" };

export default function PlayingCard({ card, faceDown = false, playable = false, onClick, small = false, className = "", style = {} }) {
  const rank = card ? (RANK_DISPLAY[card[0]] || card[0]) : null;
  const suit = card ? card[1] : null;
  const suitSymbol = suit ? SUIT_SYMBOLS[suit] : null;
  const suitColor = suit ? SUIT_COLORS[suit] : "";

  const isCustomSize = style && (style.width !== undefined || style.height !== undefined);
  const is50x100 = style && (style.width === 50 || style.width === "50px");

  const base = clsx(
    "rounded-lg border select-none flex-shrink-0 relative transition-shadow duration-300",
    isCustomSize ? "text-xs" : (small ? "w-20 h-28 text-sm" : "w-32 h-48 text-lg"),
    playable && "card-playable ring-4 ring-yellow-400/80 shadow-[0_0_15px_rgba(250,204,21,0.5)]",
    !playable && !faceDown && "opacity-90",
    className
  );

  if (faceDown) {
    return (
      <motion.div
        layout
        className={clsx(base, "bg-gradient-to-br from-blue-800 to-indigo-900 border-blue-600 flex items-center justify-center shadow-lg")}
        style={style}
      >
        <span className={clsx("text-blue-300", is50x100 ? "text-xl" : "text-4xl")}>🂠</span>
      </motion.div>
    );
  }

  if (!card) {
    // Empty slot placeholder
    return (
      <div className={clsx(base, "bg-transparent border-2 border-dashed border-slate-700 opacity-20")} style={style} />
    );
  }

  return (
    <motion.div
      layout
      whileHover={playable ? { y: -15, scale: 1.05 } : {}}
      whileTap={playable ? { scale: 0.95 } : {}}
      onClick={playable ? onClick : undefined}
      className={clsx(base, "bg-white border-slate-200 cursor-pointer shadow-md hover:shadow-xl relative")}
      style={style}
    >
      {/* Top Left Corner - Rank */}
      <div className={clsx("absolute font-black leading-none", is50x100 ? "left-1 top-1" : "left-1 top-1", suitColor)}>
        <span className={clsx(is50x100 ? "text-base" : (small ? "text-2xl" : "text-4xl"))}>{rank}</span>
      </div>

      {/* Left Center - Suit Symbol */}
      <div className={clsx("absolute pointer-events-none select-none", is50x100 ? "left-1.5 top-1/2 -translate-y-1/2" : "left-3 top-1/2 -translate-y-1/2", suitColor)}>
        <span className={clsx("font-black", is50x100 ? "text-2xl" : (small ? "text-3xl" : "text-5xl"))}>
          {suitSymbol}
        </span>
      </div>

      {/* Bottom Right Corner - Symmetrical Rank */}
      <div className={clsx("absolute font-black leading-none rotate-180", is50x100 ? "right-1 bottom-1" : "right-1 bottom-1", suitColor)}>
        <span className={clsx(is50x100 ? "text-base" : (small ? "text-2xl" : "text-4xl"))}>{rank}</span>
      </div>
    </motion.div>
  );
}
