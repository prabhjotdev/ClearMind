import React, { createContext, useContext, useState } from 'react';

interface KeyboardShortcutsContextValue {
  isHelpVisible: boolean;
  showHelp: () => void;
  hideHelp: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue>({
  isHelpVisible: false,
  showHelp: () => {},
  hideHelp: () => {},
});

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [isHelpVisible, setIsHelpVisible] = useState(false);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        isHelpVisible,
        showHelp: () => setIsHelpVisible(true),
        hideHelp: () => setIsHelpVisible(false),
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  return useContext(KeyboardShortcutsContext);
}
