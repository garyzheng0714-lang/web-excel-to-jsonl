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

const statusConfig: Record<StatusVariant, { 
  bg: string; 
  iconBg: string; 
  text: string;
  iconColor: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  idle: {
    bg: 'bg-app-subtle',
    iconBg: 'bg-app-hover',
    text: 'text-fg-muted',
    iconColor: 'text-fg-muted',
    Icon: Minus,
  },
  processing: {
    bg: 'bg-warning-soft',
    iconBg: 'bg-warning',
    text: 'text-warning',
    iconColor: 'text-white',
    Icon: Loader2,
  },
  success: {
    bg: 'bg-success-soft',
    iconBg: 'bg-success',
    text: 'text-success',
    iconColor: 'text-white',
    Icon: Check,
  },
  warning: {
    bg: 'bg-warning-soft',
    iconBg: 'bg-warning',
    text: 'text-warning',
    iconColor: 'text-white',
    Icon: AlertTriangle,
  },
  error: {
    bg: 'bg-danger-soft',
    iconBg: 'bg-danger',
    text: 'text-danger',
    iconColor: 'text-white',
    Icon: X,
  },
};

export function StatusPanel({
  status,
  title,
  message,
  details,
  warnings,
  warningsTitle = '警告',
  showProgress = false,
  className,
}: StatusPanelProps) {
  const config = statusConfig[status];
  const { Icon, bg, iconBg, text, iconColor } = config;
  const ariaLive = status === 'idle' ? 'off' : status === 'error' ? 'assertive' : 'polite';
  const role = status === 'error' ? 'alert' : 'status';

  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-busy={status === 'processing'}
      className={cn('rounded-xl p-5', bg, className)}
    >
      <div className="flex gap-4">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0',
          iconBg
        )}>
          <Icon className={cn(
            'h-5 w-5',
            iconColor,
            status === 'processing' && 'animate-spin'
          )} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className={cn('text-label', text)}>{title}</p>
          {message && <p className="text-body">{message}</p>}
          {details && details.length > 0 && (
            <div className="space-y-0.5 text-caption">
              {details.map((detail, i) => (
                <p key={i}>{detail}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {showProgress && (
        <div className="mt-4 progress-bar">
          <div className="progress-bar-fill"></div>
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-warning/20">
          <p className="text-label text-warning mb-2">{warningsTitle}</p>
          <ul className="space-y-1">
            {warnings.slice(0, 5).map((warning, i) => (
              <li key={i} className="text-caption text-warning/80 flex items-start gap-2">
                <span className="text-warning mt-1">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
