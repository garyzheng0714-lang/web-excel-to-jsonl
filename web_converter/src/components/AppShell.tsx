import React from 'react';

type AppShellProps = {
  topBar: React.ReactNode;
  sideNav: React.ReactNode;
  rightPanel?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ topBar, sideNav, rightPanel, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-app-bg">
      <div className="mx-auto flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 glass border-b border-border-subtle">
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
            {topBar}
          </div>
        </header>

        <div className="flex-1 px-6 lg:px-10 py-10">
          <div className="mx-auto max-w-[1600px]">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[200px_1fr_340px] lg:gap-12">
              <aside className="order-2 lg:order-none lg:sticky lg:top-28 lg:self-start">
                {sideNav}
              </aside>
              
              <main className="order-1 lg:order-none min-w-0">
                <div className="animate-fade-in">
                  {children}
                </div>
              </main>
              
              {rightPanel && (
                <aside className="order-3 lg:order-none lg:sticky lg:top-28 lg:self-start">
                  {rightPanel}
                </aside>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
