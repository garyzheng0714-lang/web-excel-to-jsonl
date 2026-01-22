import React, { useState, useCallback } from 'react';
import { Upload, X, FileCheck } from 'lucide-react';
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
  const bytes = file.size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function UploadCard({
  file,
  accept,
  onChange,
  onRemove,
  idleTitle,
  idleSubtitle,
  errorMessage,
  inputLabel,
}: UploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const hasError = Boolean(errorMessage);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'upload-zone group',
          file && 'has-file',
          isDragOver && 'drag-over',
          hasError && 'border-danger'
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
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all',
              'bg-app-subtle group-hover:bg-accent group-hover:scale-110'
            )}>
              <Upload className={cn(
                'w-7 h-7 transition-colors',
                hasError ? 'text-danger' : 'text-fg-muted group-hover:text-white'
              )} />
            </div>
            <p className="text-headline text-center">{idleTitle}</p>
            {idleSubtitle && (
              <p className="text-caption mt-2 text-center">{idleSubtitle}</p>
            )}
          </>
        ) : (
          <div className="w-full flex items-center gap-5 p-2">
            <div className="w-14 h-14 rounded-xl bg-success-soft flex items-center justify-center flex-shrink-0">
              <FileCheck className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-headline truncate">{file.name}</p>
              <p className="text-caption mt-1">{formatFileSize(file)}</p>
            </div>
            <button
              onClick={onRemove}
              aria-label="移除文件"
              className="btn-ghost w-10 h-10 p-0 rounded-lg flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      
      {hasError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl bg-danger-soft border border-danger/20"
        >
          <div className="w-5 h-5 rounded-full bg-danger flex items-center justify-center flex-shrink-0 mt-0.5">
            <X className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-label text-danger">错误</p>
            <p className="text-body text-danger/80 mt-1">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
