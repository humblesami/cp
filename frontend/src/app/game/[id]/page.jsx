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
  const [showMobileLeft, setShowMobileLeft] = useState(false);

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
        <span className="text-emerald-700 font-extrabold text-sm">♠ Court Piece</span>
        <div className="flex items-center gap-2">
          <TrumpIndicator trump={trump} trumpCallerSeat={trumpCallerSeat} seats={seats} />
          {/* Toggle buttons for side panels on mobile */}
          <button 
            onClick={() => { setShowMobileLeft(!showMobileLeft); setShowMobileChat(false); }} 
            className="lg:hidden bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-bold transition border border-slate-200"
          >
            📊 Score
          </button>
          <button 
            onClick={() => { setShowMobileChat(!showMobileChat); setShowMobileLeft(false); }} 
            className="lg:hidden bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-bold transition border border-slate-200"
          >
            💬 Chat
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

      {/* Game Panel (Center) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Panel: ScoreCard, Turn Info, and Quit button */}
        <div className={clsx(
          "w-48 flex-shrink-0 flex flex-col gap-3 p-3 border-r border-slate-200 bg-white z-30 transition-all duration-300",
          "lg:relative lg:flex lg:translate-x-0",
          showMobileLeft ? "fixed left-0 top-12 bottom-[144px] translate-x-0 shadow-2xl" : "fixed left-0 top-12 bottom-[144px] -translate-x-full lg:translate-x-0"
        )}>
          <ScoreCard score={score} trickWinners={trickWinners} />
          
          {/* Turn indicator */}
          {gamePhase === "playing" && (
            <div className={clsx(
              "rounded-xl p-3 text-center border transition-all duration-300",
              isYourTurn 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-slate-50 border-slate-200 text-slate-600"
            )}>
              <p className={clsx("font-bold text-xs", isYourTurn && "animate-pulse")}>
                {isYourTurn ? "Your Turn!" : "Waiting for Turn…"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isYourTurn ? "Play a valid card" : `${seats[turn]?.username || "Player"} is thinking`}
              </p>
            </div>
          )}

          <button onClick={handleQuit} className="w-full mt-auto bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-sm">
            Leave Table
          </button>
        </div>

        {/* Game Table Area (Center) */}
        <div className="flex-1 relative flex items-center justify-center p-6 bg-slate-50">
          
          {/* Perfectly Round felt table that centers exactly */}
          <div className="aspect-square w-[75%] max-w-[320px] md:max-w-[350px] relative flex items-center justify-center bg-emerald-700 border-[10px] border-amber-800 rounded-full shadow-[inset_0_0_30px_rgba(0,0,0,0.5),0_8px_16px_rgba(0,0,0,0.25)]">
            
            {/* TOP player */}
            <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 z-20">
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
            <div className="absolute left-[-15%] top-1/2 -translate-y-1/2 z-20">
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
            <div className="absolute right-[-15%] top-1/2 -translate-y-1/2 z-20">
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
            <div className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 z-20">
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

        </div>

        {/* Right Panel: Chat (Decreased Width to 48) */}
        <div className={clsx(
          "w-48 flex-shrink-0 flex flex-col gap-3 p-3 border-l border-slate-200 bg-white z-30 transition-all duration-300",
          "lg:relative lg:flex lg:translate-x-0",
          showMobileChat ? "fixed right-0 top-12 bottom-[144px] translate-x-0 shadow-2xl" : "fixed right-0 top-12 bottom-[144px] translate-x-full lg:translate-x-0"
        )}>
          <ChatPanel />
        </div>

      </div>

      {/* MY CARDS (Bottom) - Dedicated bottom section */}
      <div className="h-36 flex-shrink-0 bg-white border-t border-slate-200 z-20 relative shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pointer-events-auto">
        <div className="flex items-end justify-center h-full pb-4 relative perspective-1000">
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
            <p className="text-slate-500 font-bold bg-white border border-slate-200 px-4 py-1.5 rounded-full text-xs shadow-sm self-center">
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
