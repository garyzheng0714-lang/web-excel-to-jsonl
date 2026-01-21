import React from 'react';

type ModuleMetaChip = {
  label: string;
  value: React.ReactNode;
};

type ModuleHeaderProps = {
  summary: string;
  title: string;
  description?: React.ReactNode;
  metaChips?: ModuleMetaChip[];
};

export function ModuleHeader({ summary, title, description, metaChips }: ModuleHeaderProps) {
  const headingId = React.useId();

  return (
    <section className="space-y-6" aria-labelledby={headingId}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="chip uppercase">{summary}</span>
          </div>
          <h1 id={headingId} className="text-title text-3xl md:text-4xl">
            {title}
          </h1>
          {description ? (
            <div className="space-y-2">
              <p className="text-label">说明</p>
              <div className="max-w-2xl text-base leading-relaxed text-slate-700">
                {description}
              </div>
            </div>
          ) : null}
        </div>
        {metaChips && metaChips.length > 0 ? (
          <dl className="flex flex-wrap gap-4">
            {metaChips.map((chip) => (
              <div key={chip.label} className="min-w-[140px] border border-slate-200 bg-white px-4 py-3">
                <dt className="text-label mb-1">{chip.label}</dt>
                <dd className="font-mono text-sm text-slate-900">{chip.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
