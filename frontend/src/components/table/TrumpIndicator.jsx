"use client";

const SUIT_SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_NAMES = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };
const SUIT_COLORS = { S: "text-slate-200", H: "text-red-400", D: "text-red-400", C: "text-slate-200" };

export default function TrumpIndicator({ trump, trumpCallerSeat, seats }) {
  const callerName = seats?.[trumpCallerSeat]?.username;

  return (
    <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-center min-w-[120px] shadow-lg">
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Rung (Trump)</p>
      {trump ? (
        <>
          <p className={`text-4xl font-bold ${SUIT_COLORS[trump]}`}>{SUIT_SYMBOLS[trump]}</p>
          <p className={`text-sm font-medium ${SUIT_COLORS[trump]}`}>{SUIT_NAMES[trump]}</p>
          {callerName && <p className="text-slate-500 text-xs mt-1">by {callerName}</p>}
        </>
      ) : (
        <p className="text-slate-500 text-2xl mt-1">—</p>
      )}
    </div>
  );
}
