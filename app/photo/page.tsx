"use client"
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";

function PhotoContent() {
  const params = useSearchParams();
  const blobUrl = params.get("url");

  const imgSrc = blobUrl ? `/api/download?url=${encodeURIComponent(blobUrl)}` : null;
  const dlHref = blobUrl ? `/api/download?url=${encodeURIComponent(blobUrl)}&dl=1` : "#";

  // Pré-fetch le fichier au chargement pour que share() soit synchrone au clic
  const fileRef = useRef<File | null>(null);
  const [fileReady, setFileReady] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (!imgSrc) return;
    if (typeof navigator === "undefined" || !navigator.canShare) return;

    fetch(imgSrc)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], "bourbier_capture.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          fileRef.current = file;
          setCanShare(true);
        }
      })
      .catch(() => {})
      .finally(() => setFileReady(true));
  }, [imgSrc]);

  // Synchrone au clic — pas d'await avant share()
  const handleShare = () => {
    if (!fileRef.current) return;
    navigator.share({
      files: [fileRef.current],
      title: "Bourbier Mirror",
    }).catch((e) => {
      if (e instanceof Error && e.name !== "AbortError") console.warn("Share failed", e);
    });
  };

  if (!blobUrl || !imgSrc) {
    return (
      <div style={styles.center}>
        <p style={{ color: "#aaa" }}>Lien invalide.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.label}>BOURBIER MIRROR</p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt="Ta photo Bourbier" style={styles.photo} />

        <div style={styles.actions}>
          {canShare && (
            <button
              onClick={handleShare}
              disabled={!fileReady}
              style={{
                ...styles.buttonInsta,
                opacity: fileReady ? 1 : 0.5,
                cursor: fileReady ? "pointer" : "wait",
              }}
            >
              Partager en story
            </button>
          )}

          <a href={dlHref} download="bourbier_capture.png" style={styles.buttonDl}>
            Télécharger
          </a>

          {fileReady && !canShare && (
            <p style={styles.hint}>
              Télécharge la photo puis partage-la manuellement sur Instagram.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PhotoPage() {
  return (
    <Suspense>
      <PhotoContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "monospace",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    width: "100%",
    maxWidth: 420,
  },
  label: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    letterSpacing: "0.25em",
    margin: 0,
  },
  photo: {
    width: "100%",
    borderRadius: 8,
    display: "block",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
  },
  buttonInsta: {
    display: "block",
    width: "100%",
    padding: "14px 0",
    background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
    color: "#fff",
    textAlign: "center",
    borderRadius: 6,
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: "0.1em",
    border: "none",
    cursor: "pointer",
  },
  buttonDl: {
    display: "block",
    width: "100%",
    padding: "14px 0",
    background: "transparent",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    borderRadius: 6,
    fontFamily: "monospace",
    fontSize: 13,
    letterSpacing: "0.1em",
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.15)",
    boxSizing: "border-box",
  },
  hint: {
    color: "#aaa",
    fontSize: 12,
    textAlign: "center",
    margin: 0,
    lineHeight: 1.5,
  },
  center: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
