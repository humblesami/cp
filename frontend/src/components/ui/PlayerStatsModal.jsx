"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PlayerStatsModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError("");

    fetch(`/api/users/${userId}/stats`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load player statistics.");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [userId]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        {/* Backdrop click close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-red-800 to-rose-950 px-6 py-3 border-b border-red-700 flex justify-center items-center shadow-lg">
            <h2 className="text-white text-xl font-bold tracking-widest text-center uppercase">
              User Profile
            </h2>
          </div>

          <div className="p-6 md:p-8 flex flex-col gap-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Fetching stats…</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="bg-slate-700 text-white px-5 py-2 rounded-lg hover:bg-slate-600 transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* Profile Header Details */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                  {/* Name Left */}
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-16 bg-gradient-to-b from-gold to-yellow-600 rounded-full" />
                    <div>
                      <h3 className="text-3xl font-extrabold text-white tracking-wide">
                        {data.username}
                      </h3>
                      <p className="text-slate-400 text-sm mt-1">Player Profile Card</p>
                    </div>
                  </div>

                  {/* Avatar Right */}
                  <div className="relative">
                    <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-slate-700 bg-slate-800 shadow-xl flex items-center justify-center">
                      {data.avatar_url ? (
                        <img
                          src={data.avatar_url}
                          alt={data.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-slate-400 text-3xl font-bold">
                          {data.username ? data.username[0].toUpperCase() : "?"}
                        </span>
                      )}
                    </div>
                    {/* Club badge icons similar to screenshot */}
                    <span className="absolute -top-1.5 -left-1.5 bg-slate-800 text-red-500 rounded-full w-5 h-5 flex items-center justify-center border border-slate-700 text-xs shadow select-none">
                      ♣
                    </span>
                    <span className="absolute -bottom-1.5 -right-1.5 bg-slate-800 text-red-500 rounded-full w-5 h-5 flex items-center justify-center border border-slate-700 text-xs shadow select-none">
                      ♣
                    </span>
                  </div>
                </div>

                {/* Games Stats Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="pb-3 pr-4">Game</th>
                        <th className="pb-3 px-3 text-center">games</th>
                        <th className="pb-3 px-3 text-center">wins</th>
                        <th className="pb-3 px-3 text-center">loses</th>
                        <th className="pb-3 px-3 text-center">courts</th>
                        <th className="pb-3 px-3 text-center">gcs</th>
                        <th className="pb-3 pl-3 text-center">level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {data.stats.map((row) => (
                        <tr key={row.game} className="hover:bg-slate-800/30 transition-colors">
                          {/* Game Column Badge */}
                          <td className="py-4 pr-4 flex items-center gap-3">
                            <GameBadge game={row.game} />
                          </td>
                          <td className="py-4 px-3 text-center font-medium">{row.games}</td>
                          <td className="py-4 px-3 text-center text-green-400 font-semibold">{row.wins}</td>
                          <td className="py-4 px-3 text-center text-red-400 font-semibold">{row.loses}</td>
                          <td className="py-4 px-3 text-center font-medium">{row.courts}</td>
                          <td className="py-4 px-3 text-center font-medium">{row.gcs}</td>
                          <td className="py-4 pl-3 text-center">
                            <span className="bg-slate-800 text-gold px-2.5 py-1 rounded text-xs border border-slate-700 font-bold">
                              {row.level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-end border-t border-slate-800 pt-4 mt-2">
                  <button
                    onClick={onClose}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold px-6 py-2 rounded-lg transition"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function GameBadge({ game }) {
  if (game === "Rung") {
    return (
      <span className="flex items-center gap-1 bg-yellow-950/80 text-yellow-500 border border-yellow-700/60 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider select-none">
        <span className="text-sm">♦</span> RUNG
      </span>
    );
  }
  if (game === "Blind") {
    return (
      <span className="flex items-center gap-1 bg-rose-950/80 text-rose-400 border border-rose-700/60 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider select-none">
        <span className="text-sm">❓</span> BLIND
      </span>
    );
  }
  if (game === "Bhabhi") {
    return (
      <span className="flex items-center gap-1 bg-slate-850/80 text-slate-300 border border-slate-700/60 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider select-none">
        <span className="text-sm">♠</span> BHABHI
      </span>
    );
  }
  if (game === "Seep") {
    return (
      <span className="flex items-center gap-1 bg-blue-950/80 text-blue-400 border border-blue-700/60 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider select-none">
        <span className="text-sm">♣</span> SEEP
      </span>
    );
  }
  return <span className="text-slate-300 font-bold uppercase text-xs">{game}</span>;
}
