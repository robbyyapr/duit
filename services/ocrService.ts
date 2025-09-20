interface ScanResult {
  text: string;
  fields: {
    amount: { value: number | null; confidence: number };
    date: { value: string | null; confidence: number };
    time: { value: string | null; confidence: number };
    merchant: { value: string | null; confidence: number };
  };
  confidence: number;
  error?: string;
}

let worker: Worker | null = null;
let requestId = 0;

const ensureWorker = () => {
  if (worker) return worker;
  worker = new Worker(new URL('../workers/ocrWorker.ts', import.meta.url), { type: 'module' });
  return worker;
};

const scan = async (file: File | Blob): Promise<ScanResult> => {
  const sandbox = ensureWorker();
  const id = `req-${Date.now()}-${requestId += 1}`;

  const buffer = await file.arrayBuffer();

  return new Promise<ScanResult>((resolve, reject) => {
    const handleMessage = (event: MessageEvent<any>) => {
      if (event.data.id !== id) return;
      sandbox.removeEventListener('message', handleMessage);
      if (event.data.ok) {
        resolve(event.data.result as ScanResult);
      } else {
        reject(new Error(event.data.error || 'Gagal memproses OCR.'));
      }
    };
    sandbox.addEventListener('message', handleMessage);
    sandbox.postMessage({ id, buffer, type: (file as File).type || 'unknown' }, [buffer]);
  });
};

export const OCR = {
  scan,
};