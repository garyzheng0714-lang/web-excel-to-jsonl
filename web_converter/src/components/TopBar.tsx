import React from 'react';

type TopBarProps = {
  label: string;
  title: React.ReactNode;
  countsSlot?: React.ReactNode;
  statusSlot?: React.ReactNode;
};

export function TopBar({ label, title, countsSlot, statusSlot }: TopBarProps) {
  return (
    <header className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="w-2 h-2 bg-[#ff4d00]"></span>
          <p className="text-label">{label}</p>
        </div>
        <h1 className="text-display text-5xl md:text-7xl uppercase leading-[0.9]">{title}</h1>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-900 pt-4 md:flex-row md:items-center md:gap-8 md:border-t-0 md:pt-0">
        {countsSlot}
        {statusSlot}
      </div>
    </header>
  );
}
