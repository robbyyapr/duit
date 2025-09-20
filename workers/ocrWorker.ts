interface OcrRequest {
  id: string;
  buffer: ArrayBuffer;
  type: string;
}

self.addEventListener('message', async (event: MessageEvent<OcrRequest>) => {
  const { id, buffer, type } = event.data;
  try {
    const sizeKb = buffer.byteLength / 1024;
    if (sizeKb > 5_000) {
      throw new Error('File terlalu besar untuk diproses.');
    }

    // Placeholder OCR logic. Replace with Tesseract WASM integration.
    const result = {
      text: '',
      fields: {
        amount: { value: null, confidence: 0 },
        date: { value: null, confidence: 0 },
        time: { value: null, confidence: 0 },
        merchant: { value: null, confidence: 0 },
      },
      confidence: 0,
      error: `OCR sandbox belum diaktifkan untuk tipe ${type}`,
    };

    (self as unknown as Worker).postMessage({ id, ok: true, result });
  } catch (error) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: (error as Error).message });
  }
});