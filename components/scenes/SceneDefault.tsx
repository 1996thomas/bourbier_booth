"use client"
import type React from "react";
export const WEBCAM_STYLE: React.CSSProperties = {
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
};

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
export const drawForCapture: DrawFn = () => {};

export default function SceneDefault({ captureFlash }: { captureFlash?: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {captureFlash && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)" }} />
      )}
      <div style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        color: "rgba(255,255,255,0.35)",
        fontFamily: "monospace",
        fontSize: 13,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        userSelect: "none",
      }}>
        BOURBIER MIRROR
      </div>
    </div>
  );
}
