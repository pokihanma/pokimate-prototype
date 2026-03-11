'use client';

import { createContext, useContext, useState } from 'react';

interface TopbarActionsContextValue {
  actions: React.ReactNode;
  setActions: (node: React.ReactNode) => void;
}

const TopbarActionsContext = createContext<TopbarActionsContextValue>({
  actions: null,
  setActions: () => {},
});

export function TopbarActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<React.ReactNode>(null);
  return (
    <TopbarActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </TopbarActionsContext.Provider>
  );
}

export function useTopbarActions() {
  return useContext(TopbarActionsContext);
}
