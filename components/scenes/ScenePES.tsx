"use client"
import type React from "react";
import { useState } from "react";
import type { SceneProps } from "../SceneOverlay";

const BG = "/test_pes.png";

// SVG path data extracted from /public/mask_pes.svg — viewBox 0 0 144.78 144.75
export const HEAD_SVG_PATH = "M84.44,127.99c-11.46,9.52-28.02,13.23-42.75,16.51-2.02.45-4.13.3-6.04-.5-6.77-2.8-12.76-6.58-17.49-12.12-.95-1.12-1.64-2.44-2.04-3.86-4.7-16.77-10.1-32.83-15.6-49.37-.47-1.42-.63-2.94-.45-4.43l4.3-36.34c.31-2.64,1.65-5.06,3.72-6.74C21.15,20.49,34.66,10.7,49.8,3.44c8.33-3.99,15.9-4.63,24.45-1.29,20.59,8.03,40.29,17.41,58.96,29.3,4.09,2.61,8.9,5.45,11.05,9.71,3.58,7.08-12.51,46.22-20.06,65.49-1.33,3.39-4.37,5.8-7.97,6.36-11.58,1.82-23.08,5.14-30.6,13.79-.37.43-.76.84-1.19,1.2Z";
export const HEAD_SVG_VBW = 144.78;
export const HEAD_SVG_VBH = 144.75;

const DEFAULT_CX = 0.39;
const DEFAULT_CY = 0.30;
const DEFAULT_RX = 0.20;
const DEFAULT_RY = 0.28;

export const HEAD_CLIP = {
  x: DEFAULT_CX - DEFAULT_RX,
  y: DEFAULT_CY - DEFAULT_RY,
  w: DEFAULT_RX * 2,
  h: DEFAULT_RY * 2,
};

// Mutable — updated on every render so capture reads the current slider values.
export const liveHeadClip = { ...HEAD_CLIP };

export const SEG_CANVAS_RECT = { x: 0, y: 0, w: 1, h: 1 };

export const WEBCAM_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

let bgImg: HTMLImageElement | null = null;
if (typeof window !== "undefined") {
  const img = new Image();
  img.src = BG;
  bgImg = img;
}

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export const drawBackground: DrawFn = (ctx, cw, ch) => {
  if (bgImg?.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, cw, ch);
  } else {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, cw, ch);
  }
};

export const drawForCapture: DrawFn = () => {};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScenePES({ captureFlash, segCanvasRef }: SceneProps) {
  const [cx, setCx] = useState(DEFAULT_CX);
  const [cy, setCy] = useState(DEFAULT_CY);
  const [rx, setRx] = useState(DEFAULT_RX);
  const [ry, setRy] = useState(DEFAULT_RY);

  liveHeadClip.x = cx - rx;
  liveHeadClip.y = cy - ry;
  liveHeadClip.w = rx * 2;
  liveHeadClip.h = ry * 2;

  // clipPathUnits="objectBoundingBox" → coords are 0-1 relative to the element.
  // The path is in viewBox space (0-144.78 × 0-144.75).
  // We apply translate+scale to map it to the correct position/size in element space.
  // The canvas has scaleX(-1), so element-space x must mirror the visual x:
  //   element left = 1 - cx - rx
  const tx = (1 - cx - rx).toFixed(6);
  const ty = (cy - ry).toFixed(6);
  const sx = (rx * 2 / HEAD_SVG_VBW).toFixed(8);
  const sy = (ry * 2 / HEAD_SVG_VBH).toFixed(8);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>

      {/* Hidden inline SVG defining the clip path */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
        <defs>
          <clipPath id="pes-head-clip" clipPathUnits="objectBoundingBox">
            <path d={HEAD_SVG_PATH} transform={`translate(${tx},${ty}) scale(${sx},${sy})`} />
          </clipPath>
        </defs>
      </svg>

      {/* Background */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `url('${BG}')`,
        backgroundSize: "100% 100%",
        zIndex: 1,
      }} />

      {/* Canvas clipped to SVG head shape via inline clipPath */}
      {segCanvasRef && (
        <canvas
          ref={segCanvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            transform: "scaleX(-1)",
            clipPath: "url(#pes-head-clip)",
            zIndex: 2,
          }}
        />
      )}

      {captureFlash && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", zIndex: 99 }} />
      )}

      {/* Dev sliders */}
      <div
        data-nocapture
        style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 100,
          background: "rgba(0,0,0,0.75)", color: "#fff",
          fontFamily: "monospace", fontSize: 11,
          padding: "8px 12px", borderRadius: 6,
          display: "flex", flexDirection: "column", gap: 4,
          pointerEvents: "auto", userSelect: "none",
        }}
      >
        {([
          ["cx", cx, setCx, 0, 1, 0.005] as const,
          ["cy", cy, setCy, 0, 1, 0.005] as const,
          ["rx", rx, setRx, 0.05, 0.5, 0.005] as const,
          ["ry", ry, setRy, 0.05, 0.6, 0.005] as const,
        ]).map(([label, val, setter, min, max, step]) => (
          <label key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 18 }}>{label}</span>
            <input type="range" min={min} max={max} step={step} value={val}
              onChange={e => setter(Number(e.target.value))} style={{ width: 120 }} />
            <span style={{ width: 38, textAlign: "right" }}>{val.toFixed(3)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
