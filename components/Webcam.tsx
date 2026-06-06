"use client"
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

type Props = { style?: React.CSSProperties };

const Webcam = forwardRef<HTMLVideoElement, Props>(({ style }, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

  useEffect(() => {
    let mounted = true;
    let currentVideo: HTMLVideoElement | null = null;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (mounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          currentVideo = videoRef.current;
        }
      } catch (e) {
        console.warn("Webcam access failed", e);
      }
    };
    start();
    return () => {
      mounted = false;
      if (currentVideo && currentVideo.srcObject) {
        const tracks = (currentVideo.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ display: "block", transform: "scaleX(-1)", objectFit: "cover", position: "absolute", ...(style || {}) }}
    />
  );
});

Webcam.displayName = "Webcam";

export default Webcam;
