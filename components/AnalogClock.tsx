import React, { useEffect, useState } from 'react';

const HOURS_IN_CLOCK = 12;

const AnalogClock: React.FC = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const seconds = now.getSeconds();
  const minutes = now.getMinutes();
  const hours = now.getHours();

  const secondDegrees = seconds * 6; // 360deg / 60s
  const minuteDegrees = (minutes + seconds / 60) * 6;
  const hourDegrees = ((hours % HOURS_IN_CLOCK) + minutes / 60) * 30; // 360deg / 12h

  const markers = Array.from({ length: HOURS_IN_CLOCK }, (_, index) => (
    <span
      key={index}
      className="absolute left-1/2 top-1/2 h-3 w-[2px] bg-slate-300 dark:bg-slate-600 origin-bottom"
      style={{
        transform: `translate(-50%, -100%) rotate(${index * (360 / HOURS_IN_CLOCK)}deg)`
      }}
    />
  ));

  return (
    <div className="relative mx-auto mb-10 flex h-48 w-48 items-center justify-center rounded-full border-4 border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="absolute inset-4 rounded-full border border-slate-100 dark:border-slate-700" />
      {markers}
      <div
        className="absolute left-1/2 top-1/2 h-16 w-1 origin-bottom rounded-full bg-slate-700 dark:bg-slate-200"
        style={{ transform: `translate(-50%, -100%) rotate(${hourDegrees}deg)` }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-20 w-[3px] origin-bottom rounded-full bg-slate-500 dark:bg-slate-100"
        style={{ transform: `translate(-50%, -100%) rotate(${minuteDegrees}deg)` }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-24 w-px origin-bottom bg-red-500"
        style={{ transform: `translate(-50%, -100%) rotate(${secondDegrees}deg)` }}
      />
      <div className="absolute h-3 w-3 rounded-full bg-red-500" />
    </div>
  );
};

export default AnalogClock;