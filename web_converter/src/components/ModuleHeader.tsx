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
    <section className="space-y-6 mb-10" aria-labelledby={headingId}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3 max-w-xl">
          <span className="chip chip-accent">{summary}</span>
          <h1 id={headingId} className="text-display">
            {title}
          </h1>
          {description && (
            <div className="text-body leading-relaxed">
              {description}
            </div>
          )}
        </div>
        
        {metaChips && metaChips.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {metaChips.map((chip) => (
              <div 
                key={chip.label} 
                className="surface px-4 py-3 min-w-[120px]"
              >
                <dt className="text-label mb-1">{chip.label}</dt>
                <dd className="text-mono text-fg-primary">{chip.value}</dd>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
