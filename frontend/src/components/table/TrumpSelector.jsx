"use client";
import { motion, AnimatePresence } from "framer-motion";

const SUITS = [
  { key: "S", symbol: "♠", name: "Spades", color: "bg-slate-700 hover:bg-slate-600 text-white border-slate-500" },
  { key: "H", symbol: "♥", name: "Hearts", color: "bg-red-900 hover:bg-red-800 text-red-200 border-red-700" },
  { key: "D", symbol: "♦", name: "Diamonds", color: "bg-red-900 hover:bg-red-800 text-red-200 border-red-700" },
  { key: "C", symbol: "♣", name: "Clubs", color: "bg-slate-700 hover:bg-slate-600 text-white border-slate-500" },
];

export default function TrumpSelector({ visible, onSelect, first5Cards = [] }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-600 shadow-2xl"
          >
            <h2 className="text-white text-xl font-bold text-center mb-1">Declare Trump (Rung)</h2>
            <p className="text-slate-400 text-sm text-center mb-5">You are the Hokm caller — choose the trump suit</p>

            <div className="grid grid-cols-2 gap-3">
              {SUITS.map((suit) => (
                <button
                  key={suit.key}
                  onClick={() => onSelect(suit.key)}
                  className={`${suit.color} border rounded-xl py-4 text-center font-bold transition`}
                >
                  <div className="text-4xl mb-1">{suit.symbol}</div>
                  <div className="text-sm">{suit.name}</div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
