"use client"
import type React from "react";
import type { SceneProps } from "../SceneOverlay";

export const SEG_CANVAS_RECT = { x: 0, y: 0, w: 1, h: 1 };

export const WEBCAM_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

const SEG_CANVAS_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  display: "block",
  transform: "scaleX(-1)",
  zIndex: 1,
};

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
export const drawForCapture: DrawFn = () => {};

export default function SceneTest({ captureFlash, segCanvasRef }: SceneProps) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "#1a1a2e" }} />
      {segCanvasRef && (
        <canvas ref={segCanvasRef} style={SEG_CANVAS_STYLE} />
      )}
      {captureFlash && (
        <div style={{ position: "absolute", inset: 0, zIndex: 99, background: "rgba(255,255,255,0.7)" }} />
      )}
      <div style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        color: "rgba(255,255,255,0.4)",
        fontFamily: "monospace",
        fontSize: 13,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        userSelect: "none",
        zIndex: 2,
      }}>
        SCENE TEST — SEGMENTATION
      </div>
    </div>
  );
}
