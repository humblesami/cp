"use client";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push("/lobby");
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-emerald-700 text-xl font-bold animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 bg-slate-50 text-slate-800">
      <div className="text-center">
        <h1 className="text-5xl font-black text-emerald-700 mb-2 tracking-wide">♠ Court Piece</h1>
        <p className="text-slate-500 text-base">Rung · Hokm · The Classic South Asian Card Game</p>
      </div>

      <div className="bg-white rounded-2xl p-8 w-full max-w-sm flex flex-col gap-4 shadow-xl border border-slate-200">
        <h2 className="text-center text-slate-800 text-lg font-bold mb-2">Sign in to Play</h2>

        <button
          onClick={() => signIn("google", { callbackUrl: "/lobby" })}
          className="flex items-center justify-center gap-3 bg-white text-slate-700 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 border border-slate-200 transition shadow-sm"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <button
          onClick={() => signIn("facebook", { callbackUrl: "/lobby" })}
          className="flex items-center justify-center gap-3 bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition shadow-sm"
        >
          <FacebookIcon />
          Continue with Facebook
        </button>

        <div className="relative my-2">
          <hr className="border-slate-200" />
          <span className="absolute inset-x-0 -top-2.5 text-center text-slate-400 text-xs font-semibold">
            <span className="bg-white px-2">or</span>
          </span>
        </div>

        <p className="text-center text-slate-400 text-xs font-bold">
          Email login coming soon
        </p>
      </div>

      <p className="text-slate-500 text-xs font-bold">4 players · 52 cards · One trump to rule them all</p>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
