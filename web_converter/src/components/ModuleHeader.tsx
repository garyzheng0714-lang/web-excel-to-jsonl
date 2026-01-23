import React from 'react';

type ModuleHeaderProps = {
  summary: string;
  title: string;
  description?: React.ReactNode;
};

export function ModuleHeader({ summary, title, description }: ModuleHeaderProps) {
  const headingId = React.useId();

  return (
    <section className="space-y-6 mb-10" aria-labelledby={headingId}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3 max-w-2xl">
          <span className="chip chip-accent">{summary}</span>
          <h1 id={headingId} className="text-display">
            {title}
          </h1>
          {description && (
            <div className="text-body leading-relaxed max-w-xl">
              {description}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
