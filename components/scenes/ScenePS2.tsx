"use client"
import NextImage from "next/image";
import type React from "react";

// ─── Webcam (écran) ──────────────────────────────────────────────────────────

// Canvas style for the segmented output (same slot position, no background)
export const SEG_CANVAS_STYLE: React.CSSProperties = {
  position: "absolute",
  top: "5%",
  right: "8%",
  width: "35%",
  height: "80%",
  display: "block",
  transform: "scaleX(-1)",
  zIndex: 1,
};

export const WEBCAM_STYLE: React.CSSProperties = {
  top: "10%",
  height: "80%",
  width: "50%",
  position: "absolute",
  right: "12%",
  background: "#000",
};

// ─── Capture canvas (1080×1920 portrait) ─────────────────────────────────────

// Webcam : même position que WEBCAM_STYLE (right:12%, width:25%, top:10%, height:80%)
export const WEBCAM_CAPTURE_RECT = { x: 0.63, y: 0.10, w: 0.25, h: 0.80 };

// Décorateur 9:16 superposé sur la capture avant envoi
export const storyDecorator = "/test_scenePS2.png";

const STATS = [
  { name: "Air",            value: 9 },
  { name: "Hangtime",       value: 7 },
  { name: "Ollie",          value: 8 },
  { name: "Speed",          value: 8 },
  { name: "Spin",           value: 7 },
  { name: "Switch",         value: 8, selected: true },
  { name: "Rail Balance",   value: 6 },
  { name: "Lip Balance",    value: 5 },
  { name: "Manual Balance", value: 5 },
  { name: "Grind",          value: 7 },
];
const MAX_DOTS = 10;

// Pré-charge l'image de fond au chargement du module (côté client seulement)
let bgImg: HTMLImageElement | null = null;
if (typeof window !== "undefined") {
  const img = document.createElement("img");
  img.src = "/menu_tony.png";
  bgImg = img;
}

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

// Appelé AVANT la webcam : image de fond + panel stats
// Coordonnées en ratios → fonctionne pour n'importe quelle résolution paysage
export const drawBackground: DrawFn = (ctx, w, h) => {
  // 1. Background image (cover-scaled)
  if (bgImg?.complete && bgImg.naturalWidth > 0) {
    const scale = Math.max(w / bgImg.naturalWidth, h / bgImg.naturalHeight);
    const dw = bgImg.naturalWidth * scale;
    const dh = bgImg.naturalHeight * scale;
    ctx.drawImage(bgImg, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, w, h);
  }

  // 2. Titre
  const titleX = w * 0.025;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(h * 0.052)}px "Arial Black", Arial, sans-serif`;
  ctx.fillText("BOURBIER PARTY", titleX, h * 0.17);
  ctx.fillStyle = "#F5A31A";
  ctx.font = `bold ${Math.round(h * 0.040)}px "Arial Black", Arial, sans-serif`;
  ctx.fillText("Pro Skater 4", titleX, h * 0.17 + h * 0.058);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `${Math.round(h * 0.024)}px Arial, sans-serif`;
  ctx.fillText("Niveau : Point éphémère", titleX, h * 0.17 + h * 0.058 + h * 0.044);

  // 4. Panel stats
  const pX = w * 0.012;
  const pY = h * 0.30;
  const pW = w * 0.50 - pX * 2;
  const rowH = (h * 0.64) / STATS.length;
  const dotR  = Math.round(h * 0.018);
  const dotGap = Math.round(h * 0.008);
  const nameW  = pW * 0.44;

  ctx.fillStyle = "rgba(15,15,15,0.85)";
  ctx.fillRect(pX, pY, pW, STATS.length * rowH + 12);

  STATS.forEach((s, i) => {
    const rowY = pY + 6 + i * rowH;
    const midY = rowY + rowH / 2;

    // Bordures ligne sélectionnée
    if (s.selected) {
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pX + 8, rowY);        ctx.lineTo(pX + pW - 8, rowY);
      ctx.moveTo(pX + 8, rowY + rowH); ctx.lineTo(pX + pW - 8, rowY + rowH);
      ctx.stroke();
    }

    // Nom
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(h * 0.022)}px Arial, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(s.name.toUpperCase(), pX + nameW, midY);

    // Cercles
    const dotsX = pX + nameW + dotR;
    for (let d = 0; d < MAX_DOTS; d++) {
      ctx.beginPath();
      ctx.arc(dotsX + d * (dotR * 2 + dotGap) + dotR, midY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = d < s.value ? "#F5A31A" : "rgba(120,110,100,0.5)";
      ctx.fill();
    }
  });
};

// Appelé APRÈS la webcam : bordure orange + scanlines
export const drawForCapture: DrawFn = (ctx, w, h) => {
  const vx = WEBCAM_CAPTURE_RECT.x * w;
  const vy = WEBCAM_CAPTURE_RECT.y * h;
  const vw = WEBCAM_CAPTURE_RECT.w * w;
  const vh = WEBCAM_CAPTURE_RECT.h * h;

  // Bordure orange — identique à WEBCAM_STYLE (12px, borderRadius 16px)
  ctx.beginPath();
  ctx.roundRect(vx, vy, vw, vh, 16);
  ctx.stroke();

  // Scanlines
  for (let y = vy; y < vy + vh; y += 4) {
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(vx, y, vw, 1);
  }
};

// ─── Composant React (écran) ──────────────────────────────────────────────────

function WebcamFrame() {
  return (
    <div style={{
      position: "absolute",
      top: "10%", right: "12%",
      width: "25%", height: "80%",
      zIndex: 2, pointerEvents: "none",
      borderRadius: 4,
      background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.10) 3px, rgba(0,0,0,0.10) 4px)",
    }} />
  );
}

function StatRow({ name, value }: { name: string; value: number; selected?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.3vh 1vh" }}>
      <span style={{
        color: "#fff",
        fontSize: "1.6vh",
        fontFamily: "Arial, sans-serif",
        fontWeight: "bold",
        letterSpacing: "0.03em",
        width: "48%",
        textAlign: "right",
        paddingRight: "0.8vh",
        textShadow: "1px 1px 3px rgba(0,0,0,0.8)",
      }}>
        {name}
      </span>
      <div style={{ display: "flex", gap: "0.5vh", alignItems: "center" }}>
        {Array.from({ length: MAX_DOTS }, (_, i) => (
          <div key={i} style={{
            width: "1.8vh", height: "1.8vh",
            borderRadius: "50%",
            background: i < value ? "#F5A31A" : "rgba(120,110,100,0.5)",
            boxShadow: i < value ? "0 0 4px rgba(245,163,26,0.6)" : undefined,
            flexShrink: 0,
          }} />
        ))}
      </div>
    </div>
  );
}

export default function ScenePS2({ captureFlash }: { captureFlash?: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url('/menu_tony.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        zIndex: -1,
      }} />

      <WebcamFrame />

      <div style={{
        width: "50%", height: "100%",
        display: "flex", flexDirection: "column",
        justifyContent: "center", gap: "1.5vh",
        padding: "2vh 2%", alignItems: "center",
        textTransform: "uppercase",
      }}>
        <div style={{ alignSelf: "start", color: "white", WebkitTextStroke: "1px yellow" }}>
          <h2 style={{
            fontSize: "3.5vh",
            fontFamily: "Arial Black, Gadget, sans-serif",
            fontWeight: "bold",
            letterSpacing: "-0.02em",
            textShadow: "2px 2px 5px rgba(0,0,0,0.8)",
            margin: 0,
          }}>
            BOURBIER PARTY Pro Skater 4
          </h2>
          <p style={{ fontSize: "1.6vh", fontFamily: "Arial, sans-serif", textShadow: "1px 1px 3px rgba(0,0,0,0.8)", margin: "0.4vh 0 0" }}>
            Niveau : Point éphémère
          </p>
        </div>

        <div style={{
          width: "100%",
          background: "rgba(15,15,15,0.72)",
          padding: "1vh",
          borderRadius: "2vh",
          display: "flex", flexDirection: "column", gap: "0.2vh",
        }}>
          {STATS.map((s) => (
            <StatRow key={s.name} name={s.name} value={s.value} selected={s.selected} />
          ))}
        </div>

        <div>
          <NextImage width={220} height={132} src="/bourbier_proskater.png" alt="PS2 Logo" />
        </div>
      </div>

      {captureFlash && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)" }} />
      )}
    </div>
  );
}
