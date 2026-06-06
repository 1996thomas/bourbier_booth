"use client"
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

type Props = {
  url: string;
  onClose: () => void;
  autoCloseSec?: number;
};

export default function QROverlay({ url, onClose, autoCloseSec = 30 }: Props) {
  const [remaining, setRemaining] = useState(autoCloseSec);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) { onClose(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onClose]);

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.82)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      zIndex: 10,
    }}>
      {/* QR code */}
      <div style={{
        background: "#fff",
        padding: 20,
        borderRadius: 12,
      }}>
        <QRCodeSVG value={url} size={220} />
      </div>

      <div style={{ textAlign: "center", color: "#fff" }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>
          Scanne pour télécharger ta photo
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#aaa" }}>
          Ferme dans {remaining}s
        </p>
      </div>

      {/* Bouton fermer (pour le mode clavier/gamepad) */}
      <button
        onClick={onClose}
        style={{
          marginTop: 8,
          padding: "10px 28px",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 6,
          color: "#fff",
          fontSize: 13,
          cursor: "pointer",
          letterSpacing: "0.1em",
        }}
      >
        FERMER  [Space]
      </button>
    </div>
  );
}
