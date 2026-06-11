"use client"
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

type Props = {
  style?:    React.CSSProperties;
  deviceId?: string;
};

const Webcam = forwardRef<HTMLVideoElement, Props>(({ style, deviceId }, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

  useEffect(() => {
    let mounted = true;
    let activeStream: MediaStream | null = null;

    console.log(`[Webcam] deviceId changed → ${deviceId ?? "undefined (default camera)"}`);

    const start = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        };

        console.log("[Webcam] Requesting getUserMedia with:", JSON.stringify(constraints.video));
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!mounted) {
          console.log("[Webcam] Unmounted before stream resolved — discarding");
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        if (videoRef.current) {
          if (videoRef.current.srcObject) {
            const old = videoRef.current.srcObject as MediaStream;
            console.log(`[Webcam] Stopping previous stream (${old.getTracks().length} track(s))`);
            old.getTracks().forEach(t => t.stop());
          }
          videoRef.current.srcObject = stream;
          activeStream = stream;
          const track = stream.getVideoTracks()[0];
          console.log(`[Webcam] Stream started — label: "${track?.label}", settings:`, track?.getSettings());
        }
      } catch (e) {
        console.error("[Webcam] getUserMedia failed:", e);
      }
    };

    start();

    return () => {
      mounted = false;
      if (activeStream) {
        console.log("[Webcam] Cleanup — stopping active stream");
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [deviceId]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        display: "block",
        transform: "scaleX(-1)",
        objectFit: "cover",
        position: "absolute",
        ...(style || {}),
      }}
    />
  );
});

Webcam.displayName = "Webcam";

export default Webcam;
