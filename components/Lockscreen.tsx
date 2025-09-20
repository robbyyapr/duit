import React, { useEffect, useMemo, useState } from 'react';
import { LOCKSCREEN_PIN, LOCKSCREEN_PASSWORD } from '../constants';
import { Button } from './ui/Button';
import AnalogClock from './AnalogClock';
import { Lock } from '../services/lockService';

interface LockscreenProps {
  onUnlock: (payload: { pin?: string; password?: string }) => Promise<void>;
  attempts: number;
  cooldownUntil: number | null;
}

const useCountdown = (target: number | null) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [target]);
  if (!target) return null;
  const diff = target - now;
  if (diff <= 0) return null;
  return Math.ceil(diff / 1000);
};

export const Lockscreen: React.FC<LockscreenProps> = ({ onUnlock, attempts, cooldownUntil }) => {
  const [code, setCode] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [keypad, setKeypad] = useState<string[]>(() => Lock.randomizeKeypad());

  const countdown = useCountdown(cooldownUntil);

  useEffect(() => {
    setKeypad(Lock.randomizeKeypad());
  }, [attempts]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (countdown) return;
    setIsLoading(true);
    try {
      if (usePassword) {
        await onUnlock({ password: code });
      } else {
        await onUnlock({ pin: code });
      }
      setCode('');
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const maskedLabel = useMemo(() => (usePassword ? 'Password sesi' : 'PIN sesi'), [usePassword]);

  return (
    <div className="fixed inset-0 bg-light-bg dark:bg-dark-bg z-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm text-center space-y-6">
        <AnalogClock />
        <div>
          <h1 className="text-6xl font-bold mb-2 font-[Brush_Script_MT,cursive]">duit</h1>
          <p className="text-light-text dark:text-dark-text">Aplikasi Terkunci</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{maskedLabel}</p>
            <input
              type={usePassword ? 'password' : 'tel'}
              inputMode={usePassword ? 'text' : 'numeric'}
              value={code}
              onChange={event => setCode(event.target.value)}
              placeholder={usePassword ? 'Masukkan password sesi' : 'Masukkan PIN' }
              autoFocus
              className="w-full text-center text-2xl p-4 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none tracking-widest"
            />
          </div>

          {!usePassword && (
            <div className="grid grid-cols-3 gap-3">
              {keypad.map(digit => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => setCode(prev => (prev + digit).slice(0, 12))}
                  className="py-3 rounded-lg bg-light-bg dark:bg-dark-bg shadow-neumorphic-light dark:shadow-neumorphic-dark"
                >
                  {digit}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>PIN default: {LOCKSCREEN_PIN}</span>
            <span>Password: {LOCKSCREEN_PASSWORD}</span>
          </div>

          {attempts > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Percobaan gagal: {attempts}</p>
          )}
          {countdown && (
            <p className="text-xs text-red-500">Tunggu {countdown} detik sebelum mencoba lagi.</p>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-between items-center text-sm">
            <Button type="button" variant="ghost" onClick={() => { setUsePassword(!usePassword); setCode(''); }}>
              {usePassword ? 'Gunakan PIN' : 'Gunakan Password'}
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading || !!countdown}>
              {isLoading ? 'Membuka...' : 'Buka'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};