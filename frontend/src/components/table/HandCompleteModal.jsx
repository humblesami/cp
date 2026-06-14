"use client";
import { motion, AnimatePresence } from "framer-motion";

export default function HandCompleteModal({ visible, result, score, onContinue, onQuit }) {
  if (!visible || !result) return null;

  const { winningTeam, tricksA, tricksB, isCourt, isCoat } = result;

  let headline = `Team ${winningTeam} wins the hand!`;
  let subtext = `${winningTeam === "A" ? tricksA : tricksB} tricks`;
  if (isCourt) { headline = `🏆 COURT! Team ${winningTeam} won all 13 tricks!`; }
  else if (isCoat) { headline = `⚡ COAT! Team ${winningTeam} won the first 7 in a row!`; }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 z-50 overflow-y-auto p-4 flex justify-center items-start md:items-center"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="bg-slate-800 rounded-2xl p-7 w-full max-w-sm border border-slate-600 text-center shadow-2xl my-8 md:my-0"
          >
            <p className="text-3xl mb-2">{isCourt ? "🏆" : isCoat ? "⚡" : "🃏"}</p>
            <h2 className="text-white text-xl font-bold mb-1">{headline}</h2>
            <p className="text-slate-400 text-sm mb-5">{subtext}</p>

            {/* Match score */}
            <div className="flex justify-center gap-6 mb-6">
              <div className="text-center">
                <p className="text-blue-400 text-xs mb-1">Team A</p>
                <p className="text-white text-3xl font-bold">{score?.A ?? 0}</p>
              </div>
              <div className="text-slate-600 text-2xl self-center">—</div>
              <div className="text-center">
                <p className="text-red-400 text-xs mb-1">Team B</p>
                <p className="text-white text-3xl font-bold">{score?.B ?? 0}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onQuit}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl font-medium transition"
              >
                Quit Room
              </button>
              <button
                onClick={onContinue}
                className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2.5 rounded-xl font-bold transition"
              >
                Continue ▶
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
