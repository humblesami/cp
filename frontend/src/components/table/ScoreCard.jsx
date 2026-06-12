"use client";

export default function ScoreCard({ score, trickWinners }) {
  const tricksA = trickWinners?.filter((s) => s % 2 === 0).length ?? 0;
  const tricksB = trickWinners?.filter((s) => s % 2 !== 0).length ?? 0;

  return (
    <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-center shadow-lg min-w-[160px]">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">ScoreCard</p>

      {/* Current hand tricks */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="text-center">
          <p className="text-blue-400 text-xs">Team A</p>
          <p className="text-white text-xl font-bold">{tricksA}</p>
        </div>
        <span className="text-slate-600 text-sm">tricks</span>
        <div className="text-center">
          <p className="text-red-400 text-xs">Team B</p>
          <p className="text-white text-xl font-bold">{tricksB}</p>
        </div>
      </div>

      <hr className="border-slate-700 my-2" />

      {/* Match score */}
      <p className="text-slate-400 text-xs mb-1">Match</p>
      <div className="flex items-center justify-center gap-3">
        <div className="bg-blue-900 rounded px-3 py-1">
          <span className="text-blue-300 font-bold text-lg">{score?.A ?? 0}</span>
        </div>
        <span className="text-slate-600 text-xs">—</span>
        <div className="bg-red-900 rounded px-3 py-1">
          <span className="text-red-300 font-bold text-lg">{score?.B ?? 0}</span>
        </div>
      </div>

      <p className="text-slate-600 text-xs mt-1">First to 7 wins</p>
    </div>
  );
}
