import React from 'react';

type ModuleMetaChip = {
  label: string;
  value: React.ReactNode;
};

type ModuleHeaderProps = {
  summary: string;
  title: string;
  description: React.ReactNode;
  metaChips?: ModuleMetaChip[];
};

export function ModuleHeader({ summary, title, description, metaChips }: ModuleHeaderProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="chip uppercase">{summary}</span>
          </div>
          <h1 className="text-title text-3xl md:text-4xl">{title}</h1>
          <div className="space-y-2">
            <p className="text-label">Description</p>
            <div className="max-w-2xl text-base leading-relaxed text-slate-700">
              {description}
            </div>
          </div>
        </div>
        {metaChips && metaChips.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {metaChips.map((chip) => (
              <div key={chip.label} className="min-w-[140px] border border-slate-200 bg-white px-4 py-3">
                <p className="text-label mb-1">{chip.label}</p>
                <div className="font-mono text-sm text-slate-900">{chip.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
