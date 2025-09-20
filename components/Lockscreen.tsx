import React, { useState } from 'react';
import { LOCKSCREEN_PIN, LOCKSCREEN_PASSWORD } from '../constants';
import { Button } from './ui/Button';

interface LockscreenProps {
  onUnlock: () => void;
}

export const Lockscreen: React.FC<LockscreenProps> = ({ onUnlock }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === LOCKSCREEN_PIN || input === LOCKSCREEN_PASSWORD) {
      onUnlock();
    } else {
      setError('PIN/Password salah.');
      setInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-light-bg dark:bg-dark-bg z-50 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm text-center">
            <h1 className="text-6xl font-bold mb-2 font-[Brush_Script_MT,cursive]">duit</h1>
            <p className="mb-8 text-light-text dark:text-dark-text">Aplikasi Terkunci</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="password"
                    value={input}
                    onChange={handleInput}
                    placeholder="Masukkan PIN atau Password"
                    autoFocus
                    className="w-full text-center text-2xl p-4 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none tracking-widest"
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button type="submit" variant="primary" className="w-full">Buka</Button>
            </form>
        </div>
    </div>
  );
};
