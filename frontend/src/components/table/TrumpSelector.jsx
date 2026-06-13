"use client";
import { motion, AnimatePresence } from "framer-motion";
import PlayingCard from "./PlayingCard";

const SUITS = [
  { key: "S", symbol: "♠", name: "Spades", color: "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200" },
  { key: "H", symbol: "♥", name: "Hearts", color: "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-100" },
  { key: "D", symbol: "♦", name: "Diamonds", color: "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-100" },
  { key: "C", symbol: "♣", name: "Clubs", color: "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200" },
];

export default function TrumpSelector({ visible, onSelect, first5Cards = [] }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200 shadow-2xl flex flex-col items-center"
          >
            <h2 className="text-slate-800 text-lg font-black text-center mb-0.5">Declare Trump (Rung)</h2>
            <p className="text-slate-500 text-xs text-center mb-5 font-medium">Choose a suit based on your first 5 cards</p>

            {/* Display first 5 cards */}
            <div className="flex justify-center mb-2 w-full overflow-x-auto py-2 px-1 rounded-xl border border-slate-100">
              {first5Cards.length > 0 ? (
                first5Cards.map((card) => (
                  <div key={card} className="scale-90 origin-bottom flex-shrink-0">
                    <PlayingCard card={card} small />
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs py-4">Loading your cards…</p>
              )}
            </div>

            {/* Suit Selection Buttons */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {SUITS.map((suit) => (
                <button
                  key={suit.key}
                  onClick={() => onSelect(suit.key)}
                  className={`${suit.color} border rounded-xl py-3 text-center font-bold transition flex flex-col items-center shadow-sm`}
                >
                  <div className="text-3xl mb-0.5">{suit.symbol}</div>
                  <div className="text-xs">{suit.name}</div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
