"use client"
import { useEffect } from "react";

type Handlers = { onNext?: () => void; onPrev?: () => void; onCapture?: () => void };

export default function useControls({ onNext, onPrev, onCapture }: Handlers) {
  useEffect(() => {
    const cooldowns = { next: 0, prev: 0, capture: 0 } as Record<string, number>;
    const now = () => performance.now();

    const onKey = (e: KeyboardEvent) => {
      // Next: ArrowRight or D
      if ((e.code === "ArrowRight" || e.key.toLowerCase() === "d") && now() - cooldowns.next > 200) {
        cooldowns.next = now();
        onNext?.();
      }
      // Prev: ArrowLeft or A
      if ((e.code === "ArrowLeft" || e.key.toLowerCase() === "a") && now() - cooldowns.prev > 200) {
        cooldowns.prev = now();
        onPrev?.();
      }
      // Capture: Space or Enter
      if ((e.code === "Space" || e.key === "Enter") && now() - cooldowns.capture > 350) {
        cooldowns.capture = now();
        onCapture?.();
      }
    };

    window.addEventListener("keydown", onKey);

    let raf = 0;
    const pollGamepad = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const g of gps) {
        if (!g) continue;
        if (g.buttons[0]?.pressed && now() - cooldowns.capture > 350) {
          cooldowns.capture = now();
          onCapture?.();
        }
        const x = g.axes[0] ?? 0;
        if (x < -0.6 && now() - cooldowns.prev > 300) {
          cooldowns.prev = now();
          onPrev?.();
        }
        if (x > 0.6 && now() - cooldowns.next > 300) {
          cooldowns.next = now();
          onNext?.();
        }
      }
      raf = requestAnimationFrame(pollGamepad);
    };
    raf = requestAnimationFrame(pollGamepad);

    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [onNext, onPrev, onCapture]);
}
