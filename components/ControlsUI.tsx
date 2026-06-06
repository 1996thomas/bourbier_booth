"use client"
type Props = { onNext: () => void; onPrev: () => void; onCapture: () => void };

export default function ControlsUI({ onNext, onPrev, onCapture }: Props) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", justifyContent: "center", gap: 12, pointerEvents: "auto" }}>
      <button onClick={onPrev} style={{ padding: "10px 14px", fontSize: 14 }}>Prev (← / A)</button>
      <button onClick={onCapture} style={{ padding: "10px 18px", fontSize: 14, background: "#ff5e5e", color: "#fff", border: "none" }}>Capture (Space / Enter)</button>
      <button onClick={onNext} style={{ padding: "10px 14px", fontSize: 14 }}>Next (→ / D)</button>
    </div>
  );
}
