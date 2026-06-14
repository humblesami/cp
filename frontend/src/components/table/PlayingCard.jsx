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
  const isRed = suit === "H" || suit === "D";

  const isCustomSize = style && (style.width !== undefined || style.height !== undefined);

  const base = clsx(
    "rounded-lg border select-none flex-shrink-0 relative transition-shadow duration-300",
    isCustomSize ? "" : (small ? "w-20 h-28" : "w-32 h-48"),
    playable && "card-playable ring-4 ring-yellow-400/80 shadow-[0_0_15px_rgba(250,204,21,0.5)]",
    !playable && !faceDown && "opacity-90",
    className
  );

  const mergedStyle = {
    containerType: "inline-size",
    ...style,
  };

  if (faceDown) {
    return (
      <motion.div
        layout
        className={clsx(base, "bg-gradient-to-br from-blue-800 to-indigo-900 border-blue-600 flex items-center justify-center shadow-lg")}
        style={mergedStyle}
      >
        <span className="text-blue-300" style={{ fontSize: "48cqw" }}>🂠</span>
      </motion.div>
    );
  }

  if (!card) {
    // Empty slot placeholder
    return (
      <div className={clsx(base, "bg-transparent border-2 border-dashed border-slate-700 opacity-20")} style={mergedStyle} />
    );
  }

  return (
    <motion.div
      layout
      whileHover={playable ? { y: -15, scale: 1.05 } : {}}
      whileTap={playable ? { scale: 0.95 } : {}}
      onClick={playable ? onClick : undefined}
      className={clsx(base, "bg-white border-slate-205 cursor-pointer shadow-md hover:shadow-xl relative")}
      style={mergedStyle}
    >
      {/* Top Left Corner - Rank */}
      <div 
        className={clsx("absolute font-black leading-none left-[6%] top-[4%]", suitColor)}
        style={{ fontSize: "35cqw", color: isRed ? "#dc2626" : "#0f172a" }}
      >
        <span>{rank}</span>
      </div>

      {/* Left Center - Suit Symbol */}
      <div 
        className={clsx("absolute pointer-events-none select-none left-[6%] top-[50%] -translate-y-1/2", suitColor)}
        style={{ fontSize: "48cqw", color: isRed ? "#dc2626" : "#0f172a" }}
      >
        <span className="font-black leading-none">
          {suitSymbol}
        </span>
      </div>

      {/* Bottom Right Corner - Symmetrical Rank */}
      <div 
        className={clsx("absolute font-black leading-none rotate-180 right-[6%] bottom-[4%]", suitColor)}
        style={{ fontSize: "35cqw", color: isRed ? "#dc2626" : "#0f172a" }}
      >
        <span>{rank}</span>
      </div>
    </motion.div>
  );
}
