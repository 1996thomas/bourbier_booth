"use client"
import { useRef, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Webcam from "../../components/Webcam";
import SceneOverlay, { SCENES } from "../../components/SceneOverlay";
import useControls from "../../hooks/useControls";
import ControlsUI from "../../components/ControlsUI";
import QROverlay from "../../components/QROverlay";
import { captureFromDOM, captureSegmented, composeForStory } from "../../lib/capture";
import { useSegmentation } from "../../hooks/useSegmentation";
import { useCameraDevices } from "../../hooks/useCameraDevices";

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

type CaptureState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; url: string; dataUrl: string; printDataUrl: string; decoratorSrc?: string }
  | { status: "error" };

export default function MirrorPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [scene, setScene] = useState(0);
  const currentScene = SCENES[scene];
  const isSegmented = currentScene.segmented;
  const { cameras, reenumerate } = useCameraDevices();
  const cameraDeviceId = cameras[currentScene.cameraIndex]?.deviceId;

  // Log every time the scene or resolved camera changes
  console.log(`[MirrorPage] scene=${currentScene.name} cameraIndex=${currentScene.cameraIndex} cameras.length=${cameras.length} → deviceId=${cameraDeviceId ?? "undefined"}`);

  // Re-enumerate once the first stream is ready (labels are only available after getUserMedia)
  const hasEnumerated = cameras.length > 0 && cameras[0]?.label?.includes("no label") === false;
  useEffect(() => {
    if (!hasEnumerated) {
      const t = setTimeout(reenumerate, 1500);
      return () => clearTimeout(t);
    }
  }, [hasEnumerated, reenumerate]);
  const segCanvasRef = useSegmentation(videoRef, isSegmented);
  const [flash, setFlash] = useState(false);
  const [capture, setCapture] = useState<CaptureState>({ status: "idle" });
  const [countdown, setCountdown] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const envToken = process.env.NEXT_PUBLIC_MIRROR_TOKEN;
  const allowed = !envToken || searchParams.get("token") === envToken;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleNext = () => setScene((s) => (s + 1) % SCENES.length);
  const handlePrev = () => setScene((s) => (s + SCENES.length - 1) % SCENES.length);

  const doCapture = useCallback(async (currentScene: number) => {
    if (!videoRef.current || !stageRef.current) return;

    const s = SCENES[currentScene];

    let sceneDataUrl: string;
    if (s.segmented) {
      const segCanvas = segCanvasRef.current;
      if (!segCanvas) return;
      sceneDataUrl = captureSegmented({
        segCanvas,
        segCanvasRect:  s.segCanvasRect,
        headClip:       s.getLiveHeadClip?.() ?? s.headClip,
        headSvgPath:    s.headSvgPath,
        headSvgVbW:     s.headSvgVbW,
        headSvgVbH:     s.headSvgVbH,
        drawBackground: s.drawBackground,
        drawForeground: s.draw,
      });
    } else {
      sceneDataUrl = await captureFromDOM(stageRef.current, videoRef.current, {
        webcamRectFn: s.getWebcamRect,
        webcamRect:   s.webcamRect,
        drawForeground: s.draw,
        unmirror: true,
      });
    }

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
      setCapture({ status: "done", url, dataUrl, printDataUrl: sceneDataUrl, decoratorSrc: s.storyDecorator });
    } catch {
      setCapture({ status: "error" });
      setTimeout(() => setCapture({ status: "idle" }), 3000);
    }
  }, [segCanvasRef]);

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
        <Webcam ref={videoRef} deviceId={cameraDeviceId} style={{ ...currentScene.webcam, ...(isSegmented ? { opacity: 0 } : {}) }} />
        <SceneOverlay sceneIndex={scene} captureFlash={flash} segCanvasRef={isSegmented ? segCanvasRef : undefined} />
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
          <QROverlay url={capture.url} imageDataUrl={capture.dataUrl} printDataUrl={capture.printDataUrl} decoratorSrc={capture.decoratorSrc} onClose={handleCloseQR} />
        )}
      </div>
    </div>
  );
}
