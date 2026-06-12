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
    <div className="flex flex-col bg-slate-900/90 border border-slate-700 rounded-xl overflow-hidden" style={{ height: 220 }}>
      <div className="px-3 py-1.5 border-b border-slate-700 text-slate-400 text-xs font-medium uppercase tracking-wide">
        Chat
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
        {chatMessages.length === 0 && (
          <p className="text-slate-600 text-xs text-center mt-3">No messages</p>
        )}
        {chatMessages.map((msg, i) => (
          <p key={i} className="text-xs leading-snug">
            <span className="text-gold font-medium">{msg.username}: </span>
            <span className="text-slate-300">{msg.message}</span>
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex border-t border-slate-700">
        <input
          className="flex-1 bg-transparent text-white text-xs px-3 py-2 outline-none placeholder-slate-600"
          placeholder="Type here…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={200}
        />
        <button type="submit" className="px-3 text-gold text-xs font-medium hover:text-yellow-300">
          Send
        </button>
      </form>
    </div>
  );
}
