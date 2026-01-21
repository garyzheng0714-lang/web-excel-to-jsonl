import React from 'react';
import { AlertTriangle, Check, Loader2, Minus, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type StatusVariant = 'idle' | 'processing' | 'success' | 'warning' | 'error';

type StatusPanelProps = {
  status: StatusVariant;
  title: string;
  message?: string;
  details?: string[];
  warnings?: string[];
  warningsTitle?: string;
  showProgress?: boolean;
  className?: string;
};

const statusStyles: Record<StatusVariant, { container: string; iconWrap: string; icon: string; progress: string }> = {
  idle: {
    container: 'border-slate-200 bg-slate-50 text-slate-600',
    iconWrap: 'border-slate-200 bg-white',
    icon: 'text-slate-500',
    progress: 'bg-slate-400',
  },
  processing: {
    container: 'border-amber-200 bg-amber-50 text-amber-700',
    iconWrap: 'border-amber-200 bg-amber-100',
    icon: 'text-amber-700',
    progress: 'bg-amber-500',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    iconWrap: 'border-emerald-200 bg-emerald-100',
    icon: 'text-emerald-700',
    progress: 'bg-emerald-500',
  },
  warning: {
    container: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    iconWrap: 'border-yellow-200 bg-yellow-100',
    icon: 'text-yellow-800',
    progress: 'bg-yellow-500',
  },
  error: {
    container: 'border-red-200 bg-red-50 text-red-700',
    iconWrap: 'border-red-200 bg-red-100',
    icon: 'text-red-700',
    progress: 'bg-red-500',
  },
};

const statusIcons: Record<StatusVariant, React.ComponentType<{ className?: string }>> = {
  idle: Minus,
  processing: Loader2,
  success: Check,
  warning: AlertTriangle,
  error: X,
};

export function StatusPanel({
  status,
  title,
  message,
  details,
  warnings,
  warningsTitle = 'Warnings',
  showProgress = false,
  className,
}: StatusPanelProps) {
  const Icon = statusIcons[status];
  const styles = statusStyles[status];
  const ariaLive = status === 'idle' ? 'off' : status === 'error' ? 'assertive' : 'polite';
  const role = status === 'error' ? 'alert' : 'status';

  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-busy={status === 'processing'}
      className={cn('border-2 p-5 space-y-4', styles.container, className)}
    >
      <div className="flex gap-4">
        <div className={cn('flex h-11 w-11 items-center justify-center border-2', styles.iconWrap)}>
          <Icon className={cn('h-5 w-5', styles.icon, status === 'processing' && 'animate-spin')} />
        </div>
        <div className="flex-1 space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider">{title}</p>
          {message ? <p className="font-mono text-sm">{message}</p> : null}
          {details && details.length > 0 ? (
            <div className="space-y-1 font-mono text-xs text-current opacity-80">
              {details.map((detail) => (
                <p key={detail}>{detail}</p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {showProgress ? (
        <div className="h-1 w-full overflow-hidden border border-white/40 bg-white/60">
          <div
            className={cn('h-full w-full animate-[progress_2s_ease-in-out_infinite] origin-left', styles.progress)}
          ></div>
        </div>
      ) : null}

      {warnings && warnings.length > 0 ? (
        <div className="border-t border-current/10 pt-3">
          <p className="font-mono text-xs font-bold">{warningsTitle}</p>
          <ul className="mt-2 list-disc list-inside font-mono text-xs opacity-80">
            {warnings.slice(0, 5).map((warning, index) => (
              <li key={`${index}-${warning}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
