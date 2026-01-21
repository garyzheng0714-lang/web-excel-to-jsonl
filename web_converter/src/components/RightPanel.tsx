import React from 'react';

type RightPanelProps = {
  children: React.ReactNode;
};

export function RightPanel({ children }: RightPanelProps) {
  return <aside className="space-y-8">{children}</aside>;
}
