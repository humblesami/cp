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
import TrumpIndicator from "../../../components/table/TrumpIndicator";
import TrumpSelector from "../../../components/table/TrumpSelector";
import ChatPanel from "../../../components/table/ChatPanel";
import HandCompleteModal from "../../../components/table/HandCompleteModal";
import MatchOverModal from "../../../components/table/MatchOverModal";
import PlayerStatsModal from "../../../components/ui/PlayerStatsModal";

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
  const [showMobileChat, setShowMobileChat] = useState(false);

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

  const trickCards = currentTrick?.cards ?? {};

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col overflow-hidden text-slate-800 relative select-none">
      {/* Top bar (Header) */}
      <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 bg-white border-b border-slate-200 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <ScoreCard score={score} trickWinners={trickWinners} />
        </div>
        <span className="text-emerald-700 font-extrabold text-sm hidden md:block">♠ Court Piece</span>
        <div className="flex items-center gap-2">
          <TrumpIndicator trump={trump} trumpCallerSeat={trumpCallerSeat} seats={seats} />
          {/* Chat Toggle for Mobile */}
          <button 
            onClick={() => setShowMobileChat(!showMobileChat)} 
            className="lg:hidden bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-bold transition border border-slate-200"
          >
            💬 Chat
          </button>
          <button onClick={handleQuit} className="bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition">
            Leave
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
            className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Board Container */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Game Table Area */}
        <div className="flex-1 relative flex items-center justify-center p-6 pb-2">
          
          {/* Sizable Felt oval table that scales with container height */}
          <div className="w-[85%] h-[78%] max-w-[95%] max-h-[82%] relative flex items-center justify-center bg-emerald-700 border-[10px] border-amber-800 rounded-[50px] shadow-[inset_0_0_40px_rgba(0,0,0,0.5),0_10px_20px_rgba(0,0,0,0.25)]">
            
            {/* TOP player */}
            <div className="absolute top-[-14%] left-1/2 -translate-x-1/2 z-20">
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
            <div className="absolute left-[-8%] top-1/2 -translate-y-1/2 z-20">
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
            <div className="absolute right-[-8%] top-1/2 -translate-y-1/2 z-20">
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

            {/* BOTTOM player (Seat Label) */}
            <div className="absolute bottom-[26%] left-1/2 -translate-x-1/2 z-20">
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

            {/* Center trick area — shows all 4 played cards */}
            <div className="relative z-10 grid grid-cols-2 gap-4 w-44 h-48">
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

          </div>

          {/* YOUR HAND — Overlaid at the absolute bottom of the table area to avoid pushing layout */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-25 pointer-events-auto">
            <div className="flex items-end justify-center h-36 relative perspective-1000">
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
                        marginLeft: idx === 0 ? 0 : "-75px",
                      }}
                      className="relative transition-all duration-300 hover:-translate-y-8 hover:z-50"
                    >
                      <PlayingCard
                        card={card}
                        playable={isYourTurn && gamePhase === "playing"}
                        onClick={() => handlePlayCard(card)}
                        className="shadow-xl"
                      />
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-500 font-bold bg-white border border-slate-200 px-4 py-1.5 rounded-full text-xs shadow-sm mb-4">
                  {gamePhase === "trump_selection" ? "Waiting for trump declaration…" : "Waiting for game to start…"}
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Sidebar Chat (Desktop or Mobile Drawer) */}
        <div className={clsx(
          "w-64 flex-shrink-0 flex flex-col gap-3 p-3 border-l border-slate-200 bg-white z-30 transition-all duration-300",
          "lg:relative lg:flex lg:translate-x-0",
          showMobileChat ? "fixed right-0 top-12 bottom-0 translate-x-0 shadow-2xl" : "fixed right-0 top-12 bottom-0 translate-x-full lg:translate-x-0"
        )}>
          <ChatPanel />
          {isYourTurn && gamePhase === "playing" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-emerald-700 font-bold text-sm animate-pulse">Your Turn!</p>
              <p className="text-slate-500 text-xs mt-0.5">Click a card to play</p>
            </div>
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

      {/* Player Stats Popup */}
      {selectedPlayerId && (
        <PlayerStatsModal
          userId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  );
}
