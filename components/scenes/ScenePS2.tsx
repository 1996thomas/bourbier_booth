"use client"
import type React from "react";
import type { SceneProps } from "../SceneOverlay";

const BG = "/tonyhawkbg.png";

export const WEBCAM_STYLE: React.CSSProperties = {
  position: "absolute",
  top: "10%",
  right: "12%",
  width: "50%",
  height: "80%",
};

const SEG_CANVAS_STYLE: React.CSSProperties = {
  position: "absolute",
  top: "10%",
  right: "12%",
  width: "50%",
  height: "80%",
  display: "block",
  transform: "scaleX(-1)",
  zIndex: 1,
};

// x = 1 - right(12%) - width(50%)
export const SEG_CANVAS_RECT = { x: 0.38, y: 0.10, w: 0.50, h: 0.80 };
export const WEBCAM_CAPTURE_RECT = SEG_CANVAS_RECT;
export const storyDecorator = "/test_scenePS2.png";

let bgImg: HTMLImageElement | null = null;
if (typeof window !== "undefined") {
  const img = new Image();
  img.src = BG;
  bgImg = img;
}

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export const drawBackground: DrawFn = (ctx, w, h) => {
  if (bgImg?.complete && bgImg.naturalWidth > 0) {
    const scale = Math.max(w / bgImg.naturalWidth, h / bgImg.naturalHeight);
    const dw = bgImg.naturalWidth  * scale;
    const dh = bgImg.naturalHeight * scale;
    ctx.drawImage(bgImg, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, w, h);
  }
};

export const drawForCapture: DrawFn = () => {};

export default function ScenePS2({ captureFlash, segCanvasRef }: SceneProps) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `url('${BG}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }} />
      {segCanvasRef && (
        <canvas ref={segCanvasRef} style={SEG_CANVAS_STYLE} />
      )}
      {captureFlash && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", zIndex: 99 }} />
      )}
    </div>
  );
}
