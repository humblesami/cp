"use client";
import { useState, useRef, useEffect } from "react";
import { useSocketStore } from "../../store/socketStore";

export default function ChatPanel() {
  const { chatMessages, sendChat } = useSocketStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    sendChat(input.trim());
    setInput("");
  }

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden">
      <div className="px-3 py-1.5 border-b border-slate-200/80 text-slate-500 text-[10px] font-black uppercase tracking-wider bg-slate-50/80">
        Chat Room
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
        {chatMessages.length === 0 && (
          <p className="text-slate-400 text-[11px] text-center mt-6">No messages yet. Send a message!</p>
        )}
        {chatMessages.map((msg, i) => (
          <p key={i} className="text-[11px] leading-snug">
            <span className="text-emerald-700 font-bold">{msg.username}: </span>
            <span className="text-slate-700 font-medium">{msg.message}</span>
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex border-t border-slate-200/80 bg-slate-50/50">
        <input
          className="flex-1 bg-transparent text-slate-800 text-xs px-3 py-2 outline-none placeholder-slate-400 font-medium"
          placeholder="Type here…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={200}
        />
        <button type="submit" className="px-3 text-emerald-600 text-xs font-black hover:text-emerald-700 uppercase tracking-wide">
          Send
        </button>
      </form>
    </div>
  );
}
