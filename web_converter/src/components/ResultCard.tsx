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
    <div className={cn('surface-elevated p-6', className)}>
      <div className="space-y-4">
        <div>
          <p className="text-label mb-1">{title}</p>
          {description && <p className="text-caption">{description}</p>}
          {meta && meta.length > 0 && (
            <div className="mt-3 space-y-1">
              {meta.map((item, i) => (
                <p key={i} className="text-mono text-fg-muted">{item}</p>
              ))}
            </div>
          )}
        </div>
        {children && <div className="space-y-3">{children}</div>}
      </div>
    </div>
  );
}
