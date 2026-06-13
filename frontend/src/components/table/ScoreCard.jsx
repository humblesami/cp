"use client";

export default function ScoreCard({ score, trickWinners }) {
  const tricksA = trickWinners?.filter((s) => s !== null && s !== undefined && s % 2 === 0).length ?? 0;
  const tricksB = trickWinners?.filter((s) => s !== null && s !== undefined && s % 2 !== 0).length ?? 0;

  return (
    <div className="w-52 bg-amber-50 rounded-2xl border-4 border-amber-900/45 shadow-2xl overflow-hidden relative font-sans text-slate-800">
      {/* Clipboard Header Banner */}
      <div className="bg-red-800 text-white text-center py-1.5 font-black text-xs uppercase tracking-wider shadow-inner border-b border-amber-900/30">
        ScoreCard
      </div>

      {/* Ruled Paper Content Area */}
      <div 
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "100% 24px"
        }}
        className="p-3 bg-yellow-50/70 flex flex-col gap-2.5 relative"
      >
        {/* Notebook header lines */}
        <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase px-1">
          <span>Current:</span>
          <span className="mr-4">Overall:</span>
        </div>

        {/* Team A (Yellow/Gold) Row */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-amber-800">Team A</span>
          <div className="flex gap-4 items-center">
            {/* Current Tricks score */}
            <div className="w-7 h-7 bg-amber-400 border-2 border-amber-500 rounded flex items-center justify-center font-black text-sm text-slate-900 shadow-sm">
              {tricksA}
            </div>
            {/* Overall match points score */}
            <div className="w-7 h-7 bg-amber-500 border-2 border-amber-600 rounded flex items-center justify-center font-black text-sm text-slate-900 shadow-sm mr-2">
              {score?.A ?? 0}
            </div>
          </div>
        </div>

        {/* Team B (Blue) Row */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-blue-800">Team B</span>
          <div className="flex gap-4 items-center">
            {/* Current Tricks score */}
            <div className="w-7 h-7 bg-blue-500 border-2 border-blue-600 rounded flex items-center justify-center font-black text-sm text-white shadow-sm">
              {tricksB}
            </div>
            {/* Overall match points score */}
            <div className="w-7 h-7 bg-blue-700 border-2 border-blue-800 rounded flex items-center justify-center font-black text-sm text-white shadow-sm mr-2">
              {score?.B ?? 0}
            </div>
          </div>
        </div>

        {/* Subtext */}
        <div className="text-[9px] text-slate-500 text-center font-bold italic mt-0.5 border-t border-slate-200/50 pt-1.5">
          First to 7 match points wins
        </div>
      </div>
    </div>
  );
}
