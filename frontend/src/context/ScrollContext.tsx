// src/context/ScrollContext.tsx

import React, { createContext, useContext } from 'react';
import { useSharedValue, SharedValue } from 'react-native-reanimated';

// 1. Create the Context
const ScrollContext = createContext<SharedValue<boolean> | null>(null);

// 2. Create the Provider (Wrap this around your Tab Navigator or App)
export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isScrollingDown = useSharedValue(false);
  return (
    <ScrollContext.Provider value={isScrollingDown}>
      {children}
    </ScrollContext.Provider>
  );
};

// 3. Create a Custom Hook for easy access
export const useScrollSignal = () => {
  const context = useContext(ScrollContext);
  if (!context) throw new Error("useScrollSignal must be used within a ScrollProvider");
  return context;
};