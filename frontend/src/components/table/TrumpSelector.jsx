"use client";
import { motion, AnimatePresence } from "framer-motion";
import PlayingCard from "./PlayingCard";

const SUITS = [
  { key: "D", symbol: "♦", name: "Diamonds" },
  { key: "C", symbol: "♣", name: "Clubs" },
  { key: "H", symbol: "♥", name: "Hearts" },
  { key: "S", symbol: "♠", name: "Spades" },
];

export default function TrumpSelector({ visible, onSelect, onLeave, first5Cards = [] }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/75 z-50 overflow-y-auto p-4 backdrop-blur-md flex flex-col items-center justify-start md:justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md flex flex-col items-center justify-center my-8 md:my-0"
          >
            {/* Title / Header */}
            <div className="text-center">
              <h2 className="text-white text-3xl font-black tracking-wider uppercase drop-shadow-lg">
                Declare Trump (Rung)
              </h2>
              <p className="text-slate-355 text-sm font-medium mt-1 opacity-90 drop-shadow-md">
                Choose a suit based on your first 5 cards
              </p>
            </div>

            {/* Display first 5 cards fanned out */}
            <div className="relative w-full h-56 flex items-center justify-center mb-4">
              {first5Cards.length > 0 ? (
                first5Cards.map((card, idx) => {
                  // Compute fan rotation and translations
                  const angle = (idx - 2) * 12; // -24, -12, 0, 12, 24 degrees
                  const translateX = (idx - 2) * 45; // -90, -45, 0, 45, 90 px
                  const translateY = Math.abs(idx - 2) * 6; // 12, 6, 0, 6, 12 px
                  return (
                    <motion.div
                      key={card}
                      initial={{ opacity: 0, y: 50, rotate: 0 }}
                      animate={{ opacity: 1, y: translateY, x: translateX, rotate: angle }}
                      transition={{ type: "spring", stiffness: 120, damping: 15, delay: idx * 0.08 }}
                      style={{
                        position: "absolute",
                        transformOrigin: "bottom center",
                        zIndex: idx + 10,
                      }}
                      className="hover:z-50 hover:scale-105 transition-all duration-200"
                    >
                      <PlayingCard card={card} className="shadow-2xl" />
                    </motion.div>
                  );
                })
              ) : (
                <p className="text-slate-400 text-sm font-semibold">Loading your cards…</p>
              )}
            </div>

            {/* Suit Selection Buttons (Follows default sorting: Diamond, Club, Heart, Spade) */}
            <div className="grid grid-cols-4 gap-4 w-full px-4 max-w-sm">
              {SUITS.map((suit, idx) => (
                <motion.button
                  key={suit.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.4 + idx * 0.05 }}
                  onClick={() => onSelect(suit.key)}
                  className="aspect-square flex items-center justify-center rounded-2xl border-2 border-white bg-black/40 hover:bg-black/60 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] active:scale-95 text-white transition-all duration-200 shadow-xl cursor-pointer"
                  title={suit.name}
                >
                  <span className="text-5xl md:text-6xl select-none leading-none filter drop-shadow-md">
                    {suit.symbol}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Leave Table Button */}
            {onLeave && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.7 }}
                onClick={onLeave}
                className="bg-red-700 hover:bg-red-800 active:scale-95 text-white font-black px-6 py-2.5 rounded-xl text-xs transition-all duration-200 uppercase tracking-wider shadow-lg border border-red-900/50 cursor-pointer"
              >
                Leave Room
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
