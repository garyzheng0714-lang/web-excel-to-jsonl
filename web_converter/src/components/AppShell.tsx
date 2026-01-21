import React from 'react';

type AppShellProps = {
  topBar: React.ReactNode;
  sideNav: React.ReactNode;
  rightPanel?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ topBar, sideNav, rightPanel, children }: AppShellProps) {
  return (
    <div className="min-h-screen text-slate-900 pb-20 selection:bg-[#ff4d00] selection:text-white">
      <div className="mx-auto flex min-h-screen w-full flex-col">
        <div className="w-full px-6 pt-12">
          <div className="mx-auto max-w-[1600px]">{topBar}</div>
        </div>
        <div className="w-full flex-1 px-6 pb-12">
          <div className="mx-auto mt-12 grid max-w-[1600px] grid-cols-1 gap-12 lg:grid-cols-[96px_minmax(0,1fr)_360px] lg:items-start">
            <div className="order-2 lg:order-none">{sideNav}</div>
            <main className="app-main">{children}</main>
            {rightPanel ? <div className="order-3 lg:order-none">{rightPanel}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
