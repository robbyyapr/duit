interface AssetHash {
  url: string;
  hash: string; // base64 sha-256
}

const bufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const verifyAssets = async (assets: AssetHash[]): Promise<boolean> => {
  try {
    for (const asset of assets) {
      const response = await fetch(asset.url, { cache: 'no-store' });
      const data = await response.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', data);
      const hash = bufferToBase64(digest);
      if (hash !== asset.hash) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('[sw] Asset verification failed', error);
    return false;
  }
};

export const SW = {
  verifyAssets,
};