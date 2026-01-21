import React from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '../lib/utils';

type UploadCardProps = {
  file: File | null;
  accept: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  idleTitle: string;
  idleSubtitle?: string;
  fileIcon?: React.ReactNode;
  errorMessage?: string;
  inputLabel: string;
};

function formatFileSize(file: File) {
  return `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
}

export function UploadCard({
  file,
  accept,
  onChange,
  onRemove,
  idleTitle,
  idleSubtitle,
  fileIcon,
  errorMessage,
  inputLabel,
}: UploadCardProps) {
  const hasError = Boolean(errorMessage);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'group relative w-full h-64 border-2 border-dashed transition-colors flex flex-col items-center justify-center',
          file ? 'cursor-default' : 'cursor-pointer',
          hasError ? 'border-red-300 bg-red-50/40' : 'border-slate-300 hover:border-slate-900 bg-white'
        )}
      >
        {!file ? (
          <>
            <input
              type="file"
              accept={accept}
              onChange={onChange}
              aria-label={inputLabel}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload
              className={cn(
                'w-12 h-12 mb-6 transition-colors',
                hasError ? 'text-red-300 group-hover:text-red-500' : 'text-slate-300 group-hover:text-slate-900'
              )}
            />
            <p className="font-mono text-sm font-bold text-slate-900">{idleTitle}</p>
            {idleSubtitle ? (
              <p className="text-xs text-slate-400 mt-2 font-mono uppercase">{idleSubtitle}</p>
            ) : null}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 relative">
            <button
              onClick={onRemove}
              aria-label="Remove file"
              className="absolute top-4 right-4 p-2 hover:bg-slate-200 rounded-none transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {fileIcon ? <div className="mb-4">{fileIcon}</div> : null}
            <p className="font-mono text-lg font-bold text-slate-900">{file.name}</p>
            <p className="font-mono text-sm text-slate-500 mt-1">{formatFileSize(file)}</p>
          </div>
        )}
      </div>
      {hasError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="text-label text-red-700">错误</p>
          <p className="font-mono text-sm">{errorMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
