import React, { useMemo, useState } from 'react';

interface MasterPassphraseSetupProps {
  onSubmit: (passphrase: string) => Promise<void>;
  isProcessing?: boolean;
  error?: string;
}

const complexityChecks = [
  { id: 'length', label: 'Minimal 10 karakter', test: (value: string) => value.length >= 10 },
  { id: 'upper', label: 'Ada huruf besar', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'Ada huruf kecil', test: (value: string) => /[a-z]/.test(value) },
  { id: 'digit', label: 'Ada angka', test: (value: string) => /\d/.test(value) },
  { id: 'symbol', label: 'Ada simbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export const MasterPassphraseSetup: React.FC<MasterPassphraseSetupProps> = ({ onSubmit, isProcessing = false, error }) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checks = useMemo(() => complexityChecks.map(check => ({ ...check, ok: check.test(passphrase) })), [passphrase]);
  const isStrong = checks.every(check => check.ok);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isStrong) {
      setFormError('Passphrase belum memenuhi semua kriteria.');
      return;
    }
    if (passphrase !== confirmation) {
      setFormError('Konfirmasi passphrase tidak sama.');
      return;
    }
    setFormError(null);
    setLoading(true);
    try {
      await onSubmit(passphrase);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const disableSubmit = loading || isProcessing;

  return (
    <div className="max-w-md mx-auto text-center">
      <h1 className="text-3xl font-semibold mb-4">Buat Master Passphrase</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Passphrase ini akan digunakan untuk membuka enkripsi data. Simpan di tempat aman dan jangan dibagikan.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={passphrase}
          onChange={event => setPassphrase(event.target.value)}
          placeholder="Passphrase utama"
          autoFocus
          className="w-full p-3 rounded-lg bg-light-bg dark:bg-dark-bg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none"
        />
        <input
          type="password"
          value={confirmation}
          onChange={event => setConfirmation(event.target.value)}
          placeholder="Ulangi passphrase"
          className="w-full p-3 rounded-lg bg-light-bg dark:bg-dark-bg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none"
        />
        <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-4 text-left shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset">
          <p className="text-xs font-semibold mb-2">Syarat keamanan:</p>
          <ul className="space-y-1 text-xs">
            {checks.map(check => (
              <li key={check.id} className={check.ok ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}>
                {check.ok ? '✓' : '•'} {check.label}
              </li>
            ))}
          </ul>
        </div>
        {(error || formError) && <p className="text-red-500 text-sm">{error || formError}</p>}
        <button
          type="submit"
          disabled={disableSubmit}
          className="w-full py-3 rounded-lg bg-indigo-500 text-white font-semibold shadow-neumorphic-light dark:shadow-neumorphic-dark disabled:opacity-50"
        >
          {disableSubmit ? 'Mengamankan...' : 'Simpan & Enkripsi'}
        </button>
      </form>
    </div>
  );
};