"use client"
import { useState, useEffect, useCallback } from "react";

export type CameraDevice = {
  deviceId: string;
  label:    string;
  index:    number;
};

export function useCameraDevices(): {
  cameras:    CameraDevice[];
  reenumerate: () => void;
} {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);

  const enumerate = useCallback(async () => {
    console.log("[CameraDevices] enumerating...");
    const all  = await navigator.mediaDevices.enumerateDevices();
    const cams = all
      .filter(d => d.kind === "videoinput")
      .map((d, i) => ({
        deviceId: d.deviceId,
        label:    d.label || `Camera ${i} (no label yet — permission pending?)`,
        index:    i,
      }));

    setCameras(cams);

    if (cams.length === 0) {
      console.warn("[CameraDevices] No video input devices found");
    } else {
      console.log("[CameraDevices] Found:", cams.map(c => `[${c.index}] "${c.label}" id=${c.deviceId.slice(0, 8)}...`).join(" | "));
    }
  }, []);

  useEffect(() => {
    enumerate();
    navigator.mediaDevices.addEventListener("devicechange", enumerate);
    return () => navigator.mediaDevices.removeEventListener("devicechange", enumerate);
  }, [enumerate]);

  return { cameras, reenumerate: enumerate };
}
