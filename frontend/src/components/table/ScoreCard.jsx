"use client";

export default function ScoreCard({ score, trickWinners }) {
  const tricksA = trickWinners?.filter((s) => s !== null && s !== undefined && s % 2 === 0).length ?? 0;
  const tricksB = trickWinners?.filter((s) => s !== null && s !== undefined && s % 2 !== 0).length ?? 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-center shadow-sm w-full">
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">ScoreCard</p>

      {/* Current hand tricks */}
      <div className="flex items-center justify-center gap-4 mb-1.5">
        <div className="text-center">
          <p className="text-blue-600 text-[10px] font-bold">Team A</p>
          <p className="text-slate-800 text-lg font-black">{tricksA}</p>
        </div>
        <span className="text-slate-400 text-[10px] font-medium mt-3">tricks</span>
        <div className="text-center">
          <p className="text-rose-600 text-[10px] font-bold">Team B</p>
          <p className="text-slate-800 text-lg font-black">{tricksB}</p>
        </div>
      </div>

      <hr className="border-slate-100 my-1.5" />

      {/* Match score */}
      <p className="text-slate-500 text-[10px] font-bold mb-1">Match</p>
      <div className="flex items-center justify-center gap-2">
        <div className="bg-blue-50 border border-blue-100 rounded px-2.5 py-0.5">
          <span className="text-blue-700 font-extrabold text-sm">{score?.A ?? 0}</span>
        </div>
        <span className="text-slate-300 text-xs">—</span>
        <div className="bg-rose-50 border border-rose-100 rounded px-2.5 py-0.5">
          <span className="text-rose-700 font-extrabold text-sm">{score?.B ?? 0}</span>
        </div>
      </div>

      <p className="text-slate-400 text-[9px] mt-1.5 font-bold">First to 7 wins</p>
    </div>
  );
}
