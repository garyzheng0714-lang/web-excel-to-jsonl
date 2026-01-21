import React from 'react';
import { cn } from '../lib/utils';

type ResultCardProps = {
  title: string;
  description?: string;
  meta?: string[];
  children?: React.ReactNode;
  className?: string;
};

export function ResultCard({ title, description, meta, children, className }: ResultCardProps) {
  return (
    <div className={cn('swiss-card border border-slate-200 bg-white p-5', className)}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-slate-500">{title}</p>
          {description ? <p className="mt-2 font-mono text-xs text-slate-500">{description}</p> : null}
          {meta && meta.length > 0 ? (
            <div className="mt-3 space-y-1 font-mono text-xs text-slate-500">
              {meta.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : null}
        </div>
        {children ? <div className="space-y-3">{children}</div> : null}
      </div>
    </div>
  );
}
