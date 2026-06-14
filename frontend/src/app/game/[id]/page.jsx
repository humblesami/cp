"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useSocketStore } from "../../../store/socketStore";
import { useSocket } from "../../../hooks/useSocket";
import PlayingCard from "../../../components/table/PlayingCard";
import PlayerSeat from "../../../components/table/PlayerSeat";
import ScoreCard from "../../../components/table/ScoreCard";
import TrumpSelector from "../../../components/table/TrumpSelector";
import ChatPanel from "../../../components/table/ChatPanel";
import HandCompleteModal from "../../../components/table/HandCompleteModal";
import MatchOverModal from "../../../components/table/MatchOverModal";
import PlayerStatsModal from "../../../components/ui/PlayerStatsModal";

const RIVETS = [
  { x: "50%", y: "4%" },
  { x: "82.5%", y: "17.5%" },
  { x: "96%", y: "50%" },
  { x: "82.5%", y: "82.5%" },
  { x: "50%", y: "96%" },
  { x: "17.5%", y: "82.5%" },
  { x: "4%", y: "50%" },
  { x: "17.5%", y: "17.5%" },
];

export default function GamePage() {
  const { id: roomId } = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  useSocket();

  const {
    gamePhase, yourSeat, yourHand, handSizes, currentTrick,
    trump, turn, score, seats, trickWinners, lastHandResult,
    trumpCallerSeat, notification, clearNotification,
    declareTrump, playCard, continueGame, leaveRoom,
    connected, joinRoom,
  } = useSocketStore();

  const [joined, setJoined] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  // Re-join the room on mount / reconnection
  useEffect(() => {
    if (!connected || joined) return;
    joinRoom(roomId).then((res) => {
      if (!res.ok) {
        alert(res.error);
        router.push("/");
      } else {
        setJoined(true);
      }
    });
  }, [connected, joined, roomId]);

  // Derived state
  const isYourTurn = turn === yourSeat;
  const isHokмCaller = gamePhase === "trump_selection" && trumpCallerSeat === yourSeat;

  // Clear notifications after 3s
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(clearNotification, 3000);
    return () => clearTimeout(t);
  }, [notification]);

  async function handlePlayCard(card) {
    if (!isYourTurn) return;
    const res = await playCard(card);
    if (!res.ok) alert(res.error);
  }

  async function handleDeclareTrump(suit) {
    const res = await declareTrump(suit);
    if (!res.ok) alert(res.error);
  }

  async function handleQuit() {
    await leaveRoom();
    router.push("/");
  }

  // Map seats relative to yourSeat:
  // Bottom = you (yourSeat)
  // Top    = partner (yourSeat + 2) % 4
  // Left   = (yourSeat + 3) % 4
  // Right  = (yourSeat + 1) % 4
  const relativeSeats = {
    bottom: yourSeat ?? 0,
    top: yourSeat != null ? (yourSeat + 2) % 4 : 2,
    left: yourSeat != null ? (yourSeat + 3) % 4 : 3,
    right: yourSeat != null ? (yourSeat + 1) % 4 : 1,
  };

  if (!connected || !joined) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-sm font-bold tracking-wider animate-pulse text-emerald-400 uppercase">
          Loading Game Table…
        </p>
      </div>
    );
  }

  const trickCards = currentTrick?.cards ?? {};

  // Count uncollected tricks for Double Sir pile representation
  const uncollectedTricksCount = trickWinners?.filter((w) => w === null || w === undefined).length ?? 0;

  return (
    <main
      style={{ backgroundImage: "url('/images/bg.jpeg')" }}
      className="h-screen w-screen bg-cover bg-center flex flex-col overflow-hidden text-slate-805 relative select-none"
    >
      {/* Top Left ScoreCard (Ruled-paper Clipboard layout) */}
      <div className="absolute top-4 left-4 z-40">
        <ScoreCard score={score} trickWinners={trickWinners} />
      </div>

      {/* Top Right Controls: Active Trump Card (Rung), Rules and Leave Button */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-4">
        {/* Rules Checked Badges */}
        <div className="hidden md:flex items-center gap-2 bg-slate-900/85 border border-slate-700/80 rounded-xl px-3 py-2 text-[10px] text-slate-300 font-extrabold shadow tracking-wide uppercase">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-black">✓</span> No Ace on Ace
          </div>
          <span className="text-slate-700 font-normal">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-black">✓</span> Double Sir
          </div>
        </div>

        {/* Trump (Rung) Card widget */}
        {trump && (
          <div className="bg-white border-2 border-amber-900/40 rounded-xl p-1.5 shadow-2xl text-center flex flex-col items-center w-16 relative">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Rung</span>
            <div className={clsx(
              "text-2xl font-bold leading-none select-none",
              (trump === "H" || trump === "D") ? "text-red-650" : "text-slate-800"
            )}>
              {trump === "S" && "♠"}
              {trump === "H" && "♥"}
              {trump === "D" && "♦"}
              {trump === "C" && "♣"}
            </div>
            <span className="text-[7px] font-black text-slate-500 mt-1 uppercase tracking-wider">
              {trump === "S" && "Spades"}
              {trump === "H" && "Hearts"}
              {trump === "D" && "Diamonds"}
              {trump === "C" && "Clubs"}
            </span>
          </div>
        )}

        {/* Leave Table Button */}
        <button
          onClick={handleQuit}
          className="bg-red-700 hover:bg-red-800 text-white font-black px-4 py-2.5 rounded-xl text-xs transition uppercase tracking-wider shadow-lg border border-red-900/50"
        >
          Leave Room
        </button>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Table Area (Center Center) */}
      <div className="flex-1 relative flex items-center justify-center p-6">
        {/* Symmetrical 3D-styled Felt Table */}
        <div className="aspect-square w-[55%] max-w-[340px] md:max-w-[380px] relative flex items-center justify-center bg-gradient-to-br from-red-800 to-red-950 border-[16px] border-slate-900 rounded-full shadow-[inset_0_0_40px_rgba(0,0,0,0.85),0_15px_35px_rgba(0,0,0,0.65)]">
          {/* Gold inner ring separator */}
          <div className="absolute inset-1.5 border-2 border-amber-500/50 rounded-full pointer-events-none" />

          {/* Gold rivets around the charcoal border */}
          {RIVETS.map((rivet, idx) => (
            <div
              key={idx}
              style={{ left: rivet.x, top: rivet.y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 border border-amber-600 shadow-sm"
            />
          ))}

          {/* TOP player */}
          <div className="absolute top-[-26%] left-1/2 -translate-x-1/2 z-20">
            <PlayerSeat
              seat={relativeSeats.top}
              player={seats[relativeSeats.top]}
              cardCount={handSizes[relativeSeats.top]}
              isTurn={turn === relativeSeats.top}
              trickCard={trickCards[relativeSeats.top]}
              position="top"
              onAvatarClick={setSelectedPlayerId}
            />
          </div>

          {/* LEFT player */}
          <div className="absolute left-[-26%] top-1/2 -translate-y-1/2 z-20">
            <PlayerSeat
              seat={relativeSeats.left}
              player={seats[relativeSeats.left]}
              cardCount={handSizes[relativeSeats.left]}
              isTurn={turn === relativeSeats.left}
              trickCard={trickCards[relativeSeats.left]}
              position="left"
              onAvatarClick={setSelectedPlayerId}
            />
          </div>

          {/* RIGHT player */}
          <div className="absolute right-[-26%] top-1/2 -translate-y-1/2 z-20">
            <PlayerSeat
              seat={relativeSeats.right}
              player={seats[relativeSeats.right]}
              cardCount={handSizes[relativeSeats.right]}
              isTurn={turn === relativeSeats.right}
              trickCard={trickCards[relativeSeats.right]}
              position="right"
              onAvatarClick={setSelectedPlayerId}
            />
          </div>

          {/* Double Sir Uncollected Card Pile (Rotated stack) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            {uncollectedTricksCount > 0 && (
              <div className="relative w-20 h-28 flex items-center justify-center">
                {[...Array(Math.min(uncollectedTricksCount * 2, 8))].map((_, i) => {
                  const rotateVal = (i - 3.5) * 12 + (i % 2 === 0 ? 6 : -6);
                  const xVal = (i - 3.5) * 4;
                  const yVal = (i % 2 === 0 ? 2 : -2);
                  return (
                    <div
                      key={i}
                      style={{
                        transform: `rotate(${rotateVal}deg) translate(${xVal}px, ${yVal}px)`,
                        zIndex: i,
                      }}
                      className="absolute w-14 h-20 bg-rose-900 border-2 border-white rounded shadow-md flex items-center justify-center overflow-hidden"
                    >
                      <div className="w-[85%] h-[85%] border border-rose-950 bg-red-800 rounded flex items-center justify-center text-rose-300 text-xs font-black select-none opacity-80">
                        ♣
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MY HAND & CHATTER BOX (Bottom Section) */}
      <div className="h-40 flex-shrink-0 z-20 relative px-6 pb-4 flex justify-between items-end pointer-events-auto">
        {/* Bottom Left: Sami's Avatar and Hand Area */}
        <div className="flex items-end gap-6">
          <div className="mb-2">
            <PlayerSeat
              seat={relativeSeats.bottom}
              player={seats[relativeSeats.bottom]}
              isYou
              isTurn={isYourTurn}
              trickCard={trickCards[relativeSeats.bottom]}
              position="bottom"
              onAvatarClick={setSelectedPlayerId}
            />
          </div>

          {/* Fanned Cards */}
          <div className="flex items-end pb-3 relative perspective-1000">
            {yourHand?.length > 0 ? (
              yourHand.map((card, idx) => {
                const n = yourHand.length;
                const centerIndex = (n - 1) / 2;
                const angle = (idx - centerIndex) * 3.5;
                const yOffset = Math.pow(Math.abs(idx - centerIndex), 2) * 1.1;

                return (
                  <div
                    key={card}
                    style={{
                      transform: `rotate(${angle}deg) translateY(${yOffset}px)`,
                      transformOrigin: "bottom center",
                      zIndex: idx + 10,
                      marginLeft: idx === 0 ? 0 : "-70px",
                    }}
                    className="relative transition-all duration-300 hover:-translate-y-8 hover:z-50"
                  >
                    <PlayingCard
                      card={card}
                      playable={isYourTurn && gamePhase === "playing"}
                      onClick={() => handlePlayCard(card)}
                      className="shadow-2xl"
                    />
                  </div>
                );
              })
            ) : (
              <p className="text-slate-300 font-bold bg-slate-900/60 border border-slate-700/80 px-5 py-2 rounded-full text-xs shadow-lg self-center">
                {gamePhase === "trump_selection" ? "Waiting for trump declaration…" : "Waiting for game to start…"}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Right: Chatter Panel */}
        <div className="w-72 h-[150px] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-30 mr-2">
          <ChatPanel />
        </div>
      </div>

      {/* Trump selector overlay */}
      <TrumpSelector
        visible={isHokмCaller}
        onSelect={handleDeclareTrump}
        onLeave={handleQuit}
        first5Cards={yourHand?.slice(0, 5)}
      />

      {/* Hand complete modal */}
      <HandCompleteModal
        visible={gamePhase === "hand_complete"}
        result={lastHandResult}
        score={score}
        onContinue={continueGame}
        onQuit={handleQuit}
      />

      {/* Match over modal */}
      <MatchOverModal
        visible={gamePhase === "match_over"}
        score={score}
        yourSeat={yourSeat}
      />

      {/* Player Stats Popup */}
      {selectedPlayerId && (
        <PlayerStatsModal
          userId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </main>
  );
}
