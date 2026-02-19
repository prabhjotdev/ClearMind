import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastMessage } from '../components/common/Toast';

interface ToastContextType {
  showToast: (text: string, undoAction?: () => void, actionLabel?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, undoAction?: () => void, actionLabel?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setMessages((prev) => [...prev, { id, text, undoAction, actionLabel }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast messages={messages} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
