"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocketStore } from "../../../store/socketStore";
import { useSocket } from "../../../hooks/useSocket";
import PlayingCard from "../../../components/table/PlayingCard";
import PlayerSeat from "../../../components/table/PlayerSeat";
import ScoreCard from "../../../components/table/ScoreCard";
import TrumpIndicator from "../../../components/table/TrumpIndicator";
import TrumpSelector from "../../../components/table/TrumpSelector";
import ChatPanel from "../../../components/table/ChatPanel";
import HandCompleteModal from "../../../components/table/HandCompleteModal";
import MatchOverModal from "../../../components/table/MatchOverModal";

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

  // Re-join the room on mount / reconnection
  useEffect(() => {
    if (!connected || joined) return;
    joinRoom(roomId).then((res) => {
      if (!res.ok) {
        alert(res.error);
        router.push("/lobby");
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
    router.push("/lobby");
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

  const trickCards = currentTrick?.cards ?? {};

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800 z-10">
        <div className="flex items-center gap-3">
          <ScoreCard score={score} trickWinners={trickWinners} />
        </div>
        <span className="text-gold font-bold text-lg hidden md:block">♠ Court Piece</span>
        <div className="flex items-center gap-3">
          <TrumpIndicator trump={trump} trumpCallerSeat={trumpCallerSeat} seats={seats} />
          <button onClick={handleQuit} className="bg-red-800 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg transition">
            Leave Room
          </button>
        </div>
      </div>

      {/* Notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-700 text-white px-5 py-2 rounded-full text-sm shadow-lg border border-slate-600"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout: table + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Game Table Area */}
        <div className="flex-1 flex items-center justify-center p-4 relative">
          <div className="w-full max-w-2xl aspect-square relative flex items-center justify-center">

            {/* Felt oval table */}
            <div className="felt-table rounded-full w-4/5 h-3/5 absolute" />

            {/* TOP player */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
              <PlayerSeat
                seat={relativeSeats.top}
                player={seats[relativeSeats.top]}
                cardCount={handSizes[relativeSeats.top]}
                isTurn={turn === relativeSeats.top}
                trickCard={trickCards[relativeSeats.top]}
                position="top"
              />
            </div>

            {/* LEFT player */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <PlayerSeat
                seat={relativeSeats.left}
                player={seats[relativeSeats.left]}
                cardCount={handSizes[relativeSeats.left]}
                isTurn={turn === relativeSeats.left}
                trickCard={trickCards[relativeSeats.left]}
                position="left"
              />
            </div>

            {/* RIGHT player */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <PlayerSeat
                seat={relativeSeats.right}
                player={seats[relativeSeats.right]}
                cardCount={handSizes[relativeSeats.right]}
                isTurn={turn === relativeSeats.right}
                trickCard={trickCards[relativeSeats.right]}
                position="right"
              />
            </div>

            {/* Center trick area — shows all 4 played cards */}
            <div className="relative z-10 grid grid-cols-2 gap-2 w-28 h-28">
              {[relativeSeats.top, relativeSeats.right, relativeSeats.left, relativeSeats.bottom].map((seatIdx, pos) => (
                <div key={seatIdx} className={`flex ${pos < 2 ? "items-start" : "items-end"} ${pos % 2 === 0 ? "justify-start" : "justify-end"}`}>
                  <AnimatePresence>
                    {trickCards[seatIdx] && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <PlayingCard card={trickCards[seatIdx]} small />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* BOTTOM — your seat label + turn highlight */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <PlayerSeat
                seat={relativeSeats.bottom}
                player={seats[relativeSeats.bottom]}
                isYou
                isTurn={isYourTurn}
                trickCard={trickCards[relativeSeats.bottom]}
                position="bottom"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-3 p-3 border-l border-slate-800 bg-slate-950/40">
          <ChatPanel />

          {/* Turn indicator */}
          {isYourTurn && gamePhase === "playing" && (
            <div className="bg-yellow-400/10 border border-yellow-400/40 rounded-xl p-3 text-center">
              <p className="text-yellow-400 font-bold text-sm animate-pulse">Your Turn!</p>
              <p className="text-slate-400 text-xs mt-0.5">Click a card to play</p>
            </div>
          )}
        </div>
      </div>

      {/* YOUR HAND — fixed at bottom */}
      <div className="bg-slate-950/80 border-t border-slate-800 px-4 py-3">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {yourHand?.length > 0 ? (
            yourHand.map((card) => (
              <PlayingCard
                key={card}
                card={card}
                playable={isYourTurn && gamePhase === "playing"}
                onClick={() => handlePlayCard(card)}
              />
            ))
          ) : (
            <p className="text-slate-600 text-sm py-4">
              {gamePhase === "trump_selection" ? "Waiting for trump declaration…" : "Waiting for game to start…"}
            </p>
          )}
        </div>
      </div>

      {/* Trump selector overlay */}
      <TrumpSelector
        visible={isHokмCaller}
        onSelect={handleDeclareTrump}
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
    </div>
  );
}
