import React, { useState } from 'react';

interface MasterPassphraseUnlockProps {
  onSubmit: (passphrase: string) => Promise<void>;
  attempts: number;
  cooldownUntil: number | null;
}

const formatCooldown = (timestamp: number | null) => {
  if (!timestamp) return null;
  const diff = timestamp - Date.now();
  if (diff <= 0) return null;
  const seconds = Math.ceil(diff / 1000);
  return `${seconds} detik`;
};

export const MasterPassphraseUnlock: React.FC<MasterPassphraseUnlockProps> = ({ onSubmit, attempts, cooldownUntil }) => {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cooldownText = formatCooldown(cooldownUntil);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (cooldownText) return;
    setLoading(true);
    try {
      await onSubmit(passphrase);
      setPassphrase('');
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setPassphrase('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto text-center">
      <h1 className="text-3xl font-semibold mb-4">Masukkan Master Passphrase</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Data terenkripsi. Masukkan passphrase utama untuk membuka aplikasi.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={passphrase}
          onChange={event => setPassphrase(event.target.value)}
          placeholder="Master passphrase"
          autoFocus
          className="w-full p-3 rounded-lg bg-light-bg dark:bg-dark-bg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {attempts > 0 && !cooldownText && (
          <p className="text-xs text-gray-500 dark:text-gray-400">Percobaan gagal: {attempts}</p>
        )}
        {cooldownText && (
          <p className="text-xs text-red-500">Tunggu {cooldownText} sebelum mencoba lagi.</p>
        )}
        <button
          type="submit"
          disabled={loading || !!cooldownText}
          className="w-full py-3 rounded-lg bg-indigo-500 text-white font-semibold shadow-neumorphic-light dark:shadow-neumorphic-dark disabled:opacity-50"
        >
          {loading ? 'Membuka...' : 'Buka Aplikasi'}
        </button>
      </form>
    </div>
  );
};