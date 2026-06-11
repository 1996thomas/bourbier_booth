"use client"
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { buildLabelDataUrl } from "../lib/thermal";
import { sendToPrinter } from "../lib/printer";

type Props = {
  url: string;
  imageDataUrl?: string;
  printDataUrl?: string;
  decoratorSrc?: string;
  onClose: () => void;
  autoCloseSec?: number;
};

const BTN: React.CSSProperties = {
  padding: "10px 28px",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
  letterSpacing: "0.1em",
  width: "100%",
};

export default function QROverlay({ url, imageDataUrl, printDataUrl, decoratorSrc, onClose, autoCloseSec = 30 }: Props) {
  const [remaining, setRemaining] = useState(autoCloseSec);
  const [preparing, setPreparing] = useState(false);
  const [printStatus, setPrintStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (remaining === 0) onClose();
  }, [remaining, onClose]);

  const handlePrint = async () => {
    const src = printDataUrl ?? imageDataUrl;
    if (!src || preparing) return;
    setPreparing(true);
    setPrintStatus("sending");
    try {
      const thermalDataUrl = await buildLabelDataUrl(src, url, decoratorSrc);
      await sendToPrinter(thermalDataUrl);
      setPrintStatus("ok");
    } catch (err) {
      console.error("Print failed:", err);
      setPrintStatus("error");
    } finally {
      setPreparing(false);
      setTimeout(() => setPrintStatus("idle"), 3000);
    }
  };

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.82)",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 48,
      zIndex: 10,
    }}>
      {/* Image capturée (portrait 9:16) */}
      {imageDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageDataUrl}
          alt="Capture"
          style={{
            height: "80vh",
            width: "auto",
            borderRadius: 10,
            boxShadow: "0 0 40px rgba(0,0,0,0.6)",
            display: "block",
          }}
        />
      )}

      {/* QR + texte + boutons */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ background: "#fff", padding: 20, borderRadius: 12 }}>
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

        {(printDataUrl ?? imageDataUrl) && (
          <button
            onClick={handlePrint}
            disabled={preparing}
            style={{
              ...BTN,
              background: preparing ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)",
              color: preparing ? "#888" : "#fff",
              cursor: preparing ? "default" : "pointer",
            }}
          >
            {printStatus === "sending" ? "ENVOI…" : printStatus === "ok" ? "ENVOYÉ ✓" : printStatus === "error" ? "ERREUR ✗" : "IMPRIMER"}
          </button>
        )}

        <button
          onClick={onClose}
          style={{ ...BTN, background: "transparent", color: "#fff" }}
        >
          FERMER  [Space]
        </button>
      </div>
    </div>
  );
}
