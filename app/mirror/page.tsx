"use client"
import { useRef, useState, useCallback } from "react";
import Webcam from "../../components/Webcam";
import SceneOverlay, { SCENES } from "../../components/SceneOverlay";
import useControls from "../../hooks/useControls";
import ControlsUI from "../../components/ControlsUI";
import QROverlay from "../../components/QROverlay";
import { captureImage } from "../../lib/capture";

function StatusOverlay({ text, color = "#fff" }: { text: string; color?: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color, fontSize: 18,
    }}>
      {text}
    </div>
  );
}

function getInitialAllowed() {
  const envToken = process.env.NEXT_PUBLIC_MIRROR_TOKEN;
  if (!envToken || typeof window === "undefined") return true;
  try {
    return new URLSearchParams(window.location.search).get("token") === envToken;
  } catch {
    return false;
  }
}

type CaptureState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; url: string }
  | { status: "error" };

export default function MirrorPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [scene, setScene] = useState(0);
  const [flash, setFlash] = useState(false);
  const [capture, setCapture] = useState<CaptureState>({ status: "idle" });
  const [allowed] = useState(getInitialAllowed);

  const handleNext = () => setScene((s) => (s + 1) % SCENES.length);
  const handlePrev = () => setScene((s) => (s + SCENES.length - 1) % SCENES.length);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || capture.status === "uploading") return;

    // Flash visuel
    setFlash(true);
    setTimeout(() => setFlash(false), 220);

    // Génère le PNG
    const dataUrl = captureImage(videoRef.current, {
      drawBackground: SCENES[scene].drawBackground,
      drawForeground: SCENES[scene].draw,
      webcamRect:     SCENES[scene].webcamRect,
      unmirror:       true,
    });

    setCapture({ status: "uploading" });
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json() as { url: string };
      setCapture({ status: "done", url });
    } catch {
      setCapture({ status: "error" });
      setTimeout(() => setCapture({ status: "idle" }), 3000);
    }
  }, [capture.status, scene]);

  const handleCloseQR = useCallback(() => {
    setCapture({ status: "idle" });
  }, []);

  // Space/gamepad A ferme aussi le QR overlay
  useControls({
    onNext: capture.status === "idle" ? handleNext : undefined,
    onPrev: capture.status === "idle" ? handlePrev : undefined,
    onCapture: capture.status === "done" ? handleCloseQR : handleCapture,
  });

  if (!allowed) {
    return (
      <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>
          <h2>Accès restreint</h2>
          <p>Fournissez le paramètre <code>token</code> dans l&apos;URL pour accéder au miroir.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Webcam ref={videoRef} style={SCENES[scene].webcam} />
        <SceneOverlay sceneIndex={scene} captureFlash={flash} />
        <ControlsUI onNext={handleNext} onPrev={handlePrev} onCapture={handleCapture} />

        {capture.status === "uploading" && <StatusOverlay text="Envoi en cours…" />}
        {capture.status === "error"    && <StatusOverlay text="Erreur d'envoi — réessaie" color="#f66" />}

        {/* QR code */}
        {capture.status === "done" && (
          <QROverlay url={capture.url} onClose={handleCloseQR} />
        )}
      </div>
    </div>
  );
}
