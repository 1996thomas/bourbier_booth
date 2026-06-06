"use client"
import type React from "react";

// Dimensions partagées entre le cadre UI et la vraie vidéo
const WEBCAM_LEFT = "calc(56% + 24px)";
const WEBCAM_RIGHT = "18px";
const WEBCAM_BOTTOM = "18px";
const WEBCAM_HEIGHT = "23%";

export const WEBCAM_STYLE: React.CSSProperties = {
  top: "auto",
  left: WEBCAM_LEFT,
  right: WEBCAM_RIGHT,
  bottom: WEBCAM_BOTTOM,
  width: "1/1",
  height: WEBCAM_HEIGHT,
  objectFit: "contain",
  borderRadius: "4px",
};

const MESSAGES = [
  { text: "Salut, ça va ?", self: false },
  { text: "Oui, tout bon. Tu es prêt pour la séance ?", self: true },
  { text: "On doit tester la webcam.", self: false },
  { text: "👍 C'est parti !", self: true },
];

export function drawForCapture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pad = 12;
  const titleH = Math.floor(h * 0.06);
  const leftW = Math.floor(w * 0.58);

  const grad = ctx.createLinearGradient(0, pad, 0, pad + titleH);
  grad.addColorStop(0, "#4aa3ff");
  grad.addColorStop(1, "#1d6fd8");
  ctx.fillStyle = grad;
  ctx.fillRect(pad, pad, w - pad * 2, titleH);
  ctx.fillStyle = "#fff";
  ctx.font = `${Math.floor(titleH * 0.5)}px Tahoma, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("Windows Live Messenger", pad + 18, pad + 8);

  ctx.fillStyle = "rgba(247,249,251,0.85)";
  ctx.fillRect(pad, pad + titleH + 8, leftW - 8, h - titleH - pad * 3);

  let y = pad + titleH + 24;
  const lineH = Math.floor(h * 0.04);
  ctx.font = `${Math.floor(lineH * 0.8)}px Tahoma, sans-serif`;
  MESSAGES.forEach(({ text, self }) => {
    const mw = Math.min(leftW - 60, ctx.measureText(text).width + 24);
    const mh = lineH + 8;
    if (!self) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(pad + 10, y, mw, mh);
      ctx.fillStyle = "#333";
      ctx.textAlign = "left";
      ctx.fillText(text, pad + 22, y + 6);
    } else {
      const bx = pad + leftW - 20 - mw;
      ctx.fillStyle = "#d6f0ff";
      ctx.fillRect(bx, y, mw, mh);
      ctx.fillStyle = "#033";
      ctx.textAlign = "left";
      ctx.fillText(text, bx + 12, y + 6);
    }
    y += mh + 10;
  });

  // Cadre "Votre webcam" (border seulement, le fond = vraie vidéo)
  const vcLeft = w * 0.56 + 24;
  const vcRight = 18;
  const vcBottom = 18;
  const vcH = h * 0.23;
  const vcW = w - vcLeft - vcRight;
  const vcY = h - vcBottom - vcH;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(vcLeft, vcY, vcW, vcH);
  ctx.fillStyle = "#fff";
  ctx.font = `${Math.floor(h * 0.018)}px Tahoma, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("Votre webcam", vcLeft + 6, vcY + vcH - 20);
}

export default function SceneMSN({ captureFlash }: { captureFlash?: boolean }) {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      fontFamily: "Tahoma, 'Segoe UI', sans-serif",
    }}>

      {captureFlash && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)" }} />
      )}

      {/* Barre de titre */}
      <div style={{
        position: "absolute",
        top: 12, left: 12, right: 12,
        height: "6%",
        background: "linear-gradient(to bottom, #4aa3ff, #1d6fd8)",
        display: "flex",
        alignItems: "center",
        paddingLeft: 18,
        gap: 8,
        borderRadius: "6px 6px 0 0",
      }}>
        <div style={{
          width: 16, height: 16,
          background: "linear-gradient(135deg, #ff9800, #ff5722)",
          borderRadius: "50%",
          flexShrink: 0,
        }} />
        <span style={{ color: "#fff", fontSize: "clamp(10px, 1.8vw, 14px)", fontWeight: "bold" }}>
          Windows Live Messenger
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, paddingRight: 8 }}>
          {["_", "□", "×"].map((btn) => (
            <div key={btn} style={{
              width: 18, height: 14,
              background: "rgba(255,255,255,0.25)",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 9,
            }}>{btn}</div>
          ))}
        </div>
      </div>

      {/* Zone chat gauche */}
      <div style={{
        position: "absolute",
        top: "calc(12px + 6% + 4px)",
        left: 12,
        width: "56%",
        bottom: 12,
        background: "rgba(247,249,251,0.88)",
        borderRadius: "0 0 6px 6px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "12px 10px",
        gap: 8,
      }}>
        {MESSAGES.map(({ text, self }, i) => (
          <div key={i} style={{ display: "flex", justifyContent: self ? "flex-end" : "flex-start" }}>
            <div style={{
              background: self ? "#d6f0ff" : "#ffffff",
              border: "1px solid",
              borderColor: self ? "#aad8f0" : "#e0e0e0",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: "clamp(9px, 1.4vw, 12px)",
              color: self ? "#033" : "#333",
              maxWidth: "80%",
            }}>
              {text}
            </div>
          </div>
        ))}
        <div style={{
          borderTop: "1px solid #ccc",
          paddingTop: 6,
          background: "#fff",
          borderRadius: 4,
          padding: "4px 8px",
          color: "#aaa",
          fontSize: "clamp(9px, 1.2vw, 11px)",
        }}>
          Tapez un message...
        </div>
      </div>

      {/* Webcam remote placeholder (zone noire à droite en haut) */}
      <div style={{
        position: "absolute",
        top: "calc(12px + 6% + 4px)",
        left: "calc(56% + 24px)",
        right: 18,
        bottom: `calc(${WEBCAM_HEIGHT} + ${WEBCAM_BOTTOM} + 8px)`,
        background: "#111",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ color: "#555", fontSize: "clamp(8px, 1.1vw, 10px)", textAlign: "center", padding: "0 8px" }}>
          Remote webcam
        </span>
      </div>

      {/* Cadre "Votre webcam" — même position que WEBCAM_STYLE */}
      <div style={{
        position: "absolute",
        left: WEBCAM_LEFT,
        right: WEBCAM_RIGHT,
        bottom: WEBCAM_BOTTOM,
        height: WEBCAM_HEIGHT,
        border: "2px solid #fff",
        borderRadius: 4,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "flex-end",
        padding: "0 6px 4px",
      }}>
        <span style={{
          color: "#fff",
          fontSize: "clamp(8px, 1.1vw, 10px)",
          textShadow: "0 1px 3px rgba(0,0,0,0.9)",
        }}>
          Votre webcam
        </span>
      </div>
    </div>
  );
}
