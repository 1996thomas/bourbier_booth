"use client"
import { useRef, useState, useCallback } from "react";
import Webcam from "../../components/Webcam";
import SceneOverlay, { SCENES } from "../../components/SceneOverlay";
import useControls from "../../hooks/useControls";
import ControlsUI from "../../components/ControlsUI";
import QROverlay from "../../components/QROverlay";
import { captureFromDOM, composeForStory } from "../../lib/capture";
import { useSegmentation } from "../../hooks/useSegmentation";

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
  | { status: "done"; url: string; dataUrl: string; printDataUrl: string }
  | { status: "error" };

export default function MirrorPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [scene, setScene] = useState(0);
  const currentScene = SCENES[scene];
  const isSegmented = currentScene.segmented;
  const segCanvasRef = useSegmentation(videoRef, isSegmented);
  const [flash, setFlash] = useState(false);
  const [capture, setCapture] = useState<CaptureState>({ status: "idle" });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [allowed] = useState(getInitialAllowed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleNext = () => setScene((s) => (s + 1) % SCENES.length);
  const handlePrev = () => setScene((s) => (s + SCENES.length - 1) % SCENES.length);

  const doCapture = useCallback(async (currentScene: number) => {
    if (!videoRef.current || !stageRef.current) return;

    const s = SCENES[currentScene];
    // Segmented scenes: html2canvas captures the canvas element directly — no separate webcam compositing needed
    const sceneDataUrl = await captureFromDOM(stageRef.current, videoRef.current, {
      webcamRectFn: s.segmented ? undefined : s.getWebcamRect,
      webcamRect:   s.segmented ? undefined : s.webcamRect,
      drawForeground: s.segmented ? undefined : s.draw,
      unmirror: true,
    });

    setFlash(true);
    setTimeout(() => setFlash(false), 220);

    const decorator = s.storyDecorator;
    const dataUrl = decorator
      ? await composeForStory(sceneDataUrl, decorator)
      : sceneDataUrl;

    setCapture({ status: "uploading" });
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json() as { url: string };
      setCapture({ status: "done", url, dataUrl, printDataUrl: sceneDataUrl });
    } catch {
      setCapture({ status: "error" });
      setTimeout(() => setCapture({ status: "idle" }), 3000);
    }
  }, []);

  const handleCapture = useCallback(() => {
    if (capture.status !== "idle" || countdown !== null) return;

    const sceneAtTrigger = scene;
    let count = 3;
    setCountdown(count);

    intervalRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setCountdown(null);
        doCapture(sceneAtTrigger);
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, [capture.status, countdown, scene, doCapture]);

  const handleCloseQR = useCallback(() => {
    setCapture({ status: "idle" });
  }, []);

  const isBusy = countdown !== null || capture.status !== "idle";

  useControls({
    onNext:    !isBusy ? handleNext    : undefined,
    onPrev:    !isBusy ? handlePrev    : undefined,
    onCapture: capture.status === "done" ? handleCloseQR : (!isBusy ? handleCapture : undefined),
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
    <div style={{ width: "100vw", height: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div ref={stageRef} data-stage style={{
        position: "relative",
        aspectRatio: "4/3",
        height: "100vh",
        maxWidth: "calc(100vh * 4 / 3)",
        overflow: "hidden",
        flexShrink: 0,
        isolation: "isolate",
      }}>
        <Webcam ref={videoRef} style={{ ...currentScene.webcam, ...(isSegmented ? { opacity: 0 } : {}) }} />
        {isSegmented && currentScene.segCanvasStyle && (
          <canvas ref={segCanvasRef} style={currentScene.segCanvasStyle} />
        )}
        <SceneOverlay sceneIndex={scene} captureFlash={flash} />
        <ControlsUI onNext={handleNext} onPrev={handlePrev} onCapture={handleCapture} />

        {/* Compte à rebours */}
        {countdown !== null && (
          <div data-nocapture style={{
            position: "absolute", inset: 0, zIndex: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <span style={{
              fontSize: "30vw",
              fontWeight: "bold",
              fontFamily: "Arial Black, sans-serif",
              color: "#fff",
              textShadow: "0 0 40px rgba(0,0,0,0.8), 0 4px 20px rgba(0,0,0,0.6)",
              lineHeight: 1,
            }}>
              {countdown}
            </span>
          </div>
        )}

        {capture.status === "uploading" && <StatusOverlay text="Envoi en cours…" />}
        {capture.status === "error"    && <StatusOverlay text="Erreur d'envoi — réessaie" color="#f66" />}

        {/* QR code */}
        {capture.status === "done" && (
          <QROverlay url={capture.url} imageDataUrl={capture.dataUrl} printDataUrl={capture.printDataUrl} onClose={handleCloseQR} />
        )}
      </div>
    </div>
  );
}
