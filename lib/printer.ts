const PRINTER_URL = "http://localhost:9456";

export async function sendToPrinter(imageBase64: string): Promise<void> {
  const res = await fetch(`${PRINTER_URL}/print`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Printer error ${res.status}`);
  }
}
