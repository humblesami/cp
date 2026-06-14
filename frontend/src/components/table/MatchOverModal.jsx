"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function MatchOverModal({ visible, score, yourSeat }) {
  const router = useRouter();
  const yourTeam = yourSeat % 2 === 0 ? "A" : "B";
  const winner = (score?.A ?? 0) >= 7 ? "A" : "B";
  const youWon = yourTeam === winner;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 z-50 overflow-y-auto p-4 flex justify-center items-start md:items-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-600 text-center shadow-2xl my-8 md:my-0"
          >
            <p className="text-5xl mb-3">{youWon ? "🏆" : "💀"}</p>
            <h2 className={`text-2xl font-bold mb-1 ${youWon ? "text-yellow-400" : "text-slate-400"}`}>
              {youWon ? "You Win!" : "You Lose"}
            </h2>
            <p className="text-slate-400 mb-6">Team {winner} wins the match</p>

            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-blue-400 text-sm mb-1">Team A</p>
                <p className="text-white text-4xl font-bold">{score?.A ?? 0}</p>
              </div>
              <div className="text-slate-600 text-3xl self-center">—</div>
              <div className="text-center">
                <p className="text-red-400 text-sm mb-1">Team B</p>
                <p className="text-white text-4xl font-bold">{score?.B ?? 0}</p>
              </div>
            </div>

            <button
              onClick={() => router.push("/lobby")}
              className="w-full bg-gold text-slate-900 font-bold py-3 rounded-xl hover:bg-yellow-400 transition text-lg"
            >
              Back to Lobby
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
