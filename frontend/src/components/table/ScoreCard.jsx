"use client";

export default function ScoreCard({ score, trickWinners, yourSeat = 0 }) {
  const tricksA = trickWinners?.filter((s) => s !== null && s !== undefined && s % 2 === 0).length ?? 0;
  const tricksB = trickWinners?.filter((s) => s !== null && s !== undefined && s % 2 !== 0).length ?? 0;

  const isTeamA = yourSeat % 2 === 0;
  const yourTricks = isTeamA ? tricksA : tricksB;
  const otherTricks = isTeamA ? tricksB : tricksA;
  const yourMatches = isTeamA ? (score?.A ?? 0) : (score?.B ?? 0);
  const otherMatches = isTeamA ? (score?.B ?? 0) : (score?.A ?? 0);

  return (
    <div className="w-[150px] bg-slate-900/90 border border-slate-700/80 rounded-xl overflow-hidden shadow-xl text-white font-sans text-xs">
      <div className="bg-slate-800 px-2 py-1 text-center font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-700">
        Scorecard
      </div>
      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="bg-slate-800/50 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-700/50">
            <th className="py-1 px-1.5 text-left">Team</th>
            <th className="py-1 px-1.5">Your</th>
            <th className="py-1 px-1.5">Other</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-700/30">
            <td className="py-1 px-1.5 text-left text-slate-300 font-medium">Tricks</td>
            <td className="py-1 px-1.5 font-bold text-emerald-400">{yourTricks}</td>
            <td className="py-1 px-1.5 font-bold text-slate-300">{otherTricks}</td>
          </tr>
          <tr>
            <td className="py-1 px-1.5 text-left text-slate-300 font-medium">Matches</td>
            <td className="py-1 px-1.5 font-bold text-amber-400">{yourMatches}</td>
            <td className="py-1 px-1.5 font-bold text-slate-300">{otherMatches}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
