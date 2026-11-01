"use client";

import React, { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export const ElevatorPreloader: React.FC = () => {
  // Preloader phases: 'waiting' -> 'pressed' -> 'closing' -> 'moving' -> 'opening' -> 'done'
  const [phase, setPhase] = useState<string>("waiting");
  const [floor, setFloor] = useState<number>(1);
  const [hasMounted, setHasMounted] = useState<boolean>(false);

  useEffect(() => {
    setHasMounted(true);
    // If the user already experienced the preloader in this session, skip immediately
    if (typeof window !== "undefined" && sessionStorage.getItem("elevator_preloaded") === "true") {
      setPhase("done");
      return;
    }

    // Auto trigger button press after 2.5s if user hasn't clicked yet
    const autoTrigger = setTimeout(() => {
      setPhase((prev) => (prev === "waiting" ? "pressed" : prev));
    }, 2800);

    return () => clearTimeout(autoTrigger);
  }, []);

  // Handle the sequence of animations
  useEffect(() => {
    if (phase === "done") return;

    let timeout: NodeJS.Timeout;
    if (phase === "pressed") {
      // Wait for button glow effect before closing doors
      timeout = setTimeout(() => setPhase("closing"), 700);
    } else if (phase === "closing") {
      // Wait for doors to fully close before moving
      timeout = setTimeout(() => setPhase("moving"), 1400);
    } else if (phase === "moving") {
      // Simulate elevator going up (counting floors)
      let currentFloor = 1;
      const floorInterval = setInterval(() => {
        currentFloor += 1;
        setFloor(currentFloor);
        if (currentFloor === 10) {
          clearInterval(floorInterval);
          // Wait a moment at the top floor before opening
          setTimeout(() => setPhase("opening"), 500);
        }
      }, 200); // Speed of counting floors

      return () => {
        clearInterval(floorInterval);
        clearTimeout(timeout);
      };
    } else if (phase === "opening") {
      // Wait for doors to fully open before hiding preloader layer entirely
      timeout = setTimeout(() => {
        setPhase("done");
        if (typeof window !== "undefined") {
          sessionStorage.setItem("elevator_preloaded", "true");
        }
      }, 1400);
    }

    return () => clearTimeout(timeout);
  }, [phase]);

  if (!hasMounted || phase === "done") {
    return null;
  }

  // Determine if doors should be in the open state
  const isDoorOpen = phase === "waiting" || phase === "pressed" || phase === "opening" || phase === "done";

  return (
    <>
      <style jsx global>{`
        @keyframes rumble {
          0% { transform: translateY(0); }
          25% { transform: translateY(-1.5px); }
          50% { transform: translateY(1.5px); }
          75% { transform: translateY(-0.5px); }
          100% { transform: translateY(0); }
        }
        .animate-rumble {
          animation: rumble 0.2s infinite;
        }
        .elevator-door-texture {
          background-image: 
            linear-gradient(to right, rgba(0,0,0,0.4) 0px, transparent 2px),
            linear-gradient(to right, rgba(255, 215, 0, 0.05) 0px, transparent 1px);
          background-size: 40px 100%, 8px 100%;
        }
      `}</style>

      {/* PRELOADER OVERLAY */}
      <div
        dir="ltr"
        className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-1000 ${
          phase === "done" ? "opacity-0 pointer-events-none" : "opacity-100"
        } ${phase === "moving" ? "animate-rumble" : ""}`}
      >
        {/* LOBBY BACKGROUND: Hides the website. Fades out when doors open */}
        <div
          className={`absolute inset-0 bg-[#050810] transition-opacity duration-[1500ms] ${
            phase === "opening" ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* ELEVATOR DIGITAL INDICATOR */}
        <div
          className={`absolute top-16 z-40 transition-all duration-700 transform ${
            phase === "closing" || phase === "moving"
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4"
          }`}
        >
          <div className="bg-[#0a0a0a] border-2 border-slate-700 rounded-2xl px-8 py-3 shadow-[inset_0_0_20px_rgba(0,0,0,1)] flex items-center gap-4">
            <div
              className="text-amber-500 font-mono text-5xl font-black tracking-widest min-w-[2ch] text-center"
              style={{ textShadow: "0 0 12px rgba(245, 158, 11, 0.9)" }}
            >
              {floor}
            </div>
            <ChevronUp
              className={`text-amber-500 w-8 h-8 ${phase === "moving" ? "animate-pulse" : ""}`}
              style={{ filter: "drop-shadow(0 0 8px rgba(245, 158, 11, 0.9))" }}
            />
          </div>
        </div>

        {/* LEFT ELEVATOR DOOR */}
        <div
          className={`absolute inset-y-0 left-0 w-1/2 bg-[#0c1222] border-r-2 border-amber-500/40 shadow-[10px_0_30px_rgba(0,0,0,0.8)] transform transition-transform duration-[1500ms] ease-in-out z-30 elevator-door-texture ${
            isDoorOpen ? "-translate-x-full" : "translate-x-0"
          }`}
        >
          {/* Door Groove / Handle details */}
          <div className="absolute top-0 bottom-0 right-4 w-[1px] bg-slate-800" />
          <div className="absolute top-1/2 right-2 w-3 h-32 bg-slate-900 rounded-full shadow-inner border border-slate-800 -translate-y-1/2 flex items-center justify-center">
            <div className="w-1 h-20 bg-slate-950 rounded-full" />
          </div>
        </div>

        {/* RIGHT ELEVATOR DOOR */}
        <div
          className={`absolute inset-y-0 right-0 w-1/2 bg-[#0c1222] border-l-2 border-amber-500/40 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] transform transition-transform duration-[1500ms] ease-in-out z-30 elevator-door-texture ${
            isDoorOpen ? "translate-x-full" : "translate-x-0"
          }`}
        >
          {/* Door Groove / Handle details */}
          <div className="absolute top-0 bottom-0 left-4 w-[1px] bg-slate-800" />
          <div className="absolute top-1/2 left-2 w-3 h-32 bg-slate-900 rounded-full shadow-inner border border-slate-800 -translate-y-1/2 flex items-center justify-center">
            <div className="w-1 h-20 bg-slate-950 rounded-full" />
          </div>
        </div>

        {/* LOBBY CALL BUTTON & BRANDING */}
        <div
          dir="rtl"
          className={`z-40 flex flex-col items-center justify-center transition-all duration-700 ${
            phase === "waiting" || phase === "pressed"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-90 pointer-events-none"
          }`}
        >
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-amber-400 tracking-tight drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              آسانرو اطمینان امیر کرمان
            </h2>
            <p className="text-slate-400 tracking-[0.25em] text-xs sm:text-sm uppercase font-mono font-bold">
              Elevator Engineering & Safety
            </p>
          </div>

          <div className="relative group">
            {/* Outer decorative ring */}
            <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-xl group-hover:bg-amber-500/30 transition-all" />

            {/* The Elevator Call Button */}
            <button
              type="button"
              onClick={() => setPhase("pressed")}
              disabled={phase !== "waiting"}
              aria-label="احضار آسانسور و ورود به سایت"
              className={`relative flex items-center justify-center w-28 h-28 rounded-full border-4 transition-all duration-300 ${
                phase === "waiting"
                  ? "border-amber-500/60 bg-slate-950 text-amber-400 hover:border-amber-400 hover:scale-105 cursor-pointer shadow-2xl shadow-amber-500/20"
                  : "border-amber-400 bg-amber-500 text-slate-950 shadow-[0_0_60px_rgba(245,158,11,1)] scale-95 cursor-default"
              }`}
            >
              <ChevronUp
                size={56}
                strokeWidth={phase === "waiting" ? 2.5 : 3.5}
                className={`transition-transform duration-300 ${
                  phase === "waiting" ? "group-hover:-translate-y-1" : ""
                }`}
              />

              {/* Pulsing effect when waiting */}
              {phase === "waiting" && (
                <div className="absolute inset-0 rounded-full border-2 border-amber-400 opacity-0 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
              )}
            </button>
          </div>

          <p
            className={`mt-8 text-slate-400 text-sm font-bold transition-opacity duration-300 ${
              phase === "waiting" ? "animate-pulse opacity-100" : "opacity-0"
            }`}
          >
            جهت احضار آسانسور و ورود به وبسایت کلیک کنید
          </p>
        </div>
      </div>
    </>
  );
};

export default ElevatorPreloader;