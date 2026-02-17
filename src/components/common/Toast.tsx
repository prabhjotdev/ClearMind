import React, { useEffect, useState, useCallback } from 'react';
import './Toast.css';

export interface ToastMessage {
  id: string;
  text: string;
  undoAction?: () => void;
  duration?: number;
}

interface ToastProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

function ToastItem({
  message,
  onDismiss,
}: {
  message: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const duration = message.duration || 6000;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(message.id), 200);
  }, [message.id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [dismiss, duration]);

  return (
    <div
      className={`toast-item ${exiting ? 'toast-item--exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="toast-text">{message.text}</span>
      {message.undoAction && (
        <button
          className="toast-undo"
          onClick={() => {
            message.undoAction!();
            dismiss();
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}

export default function Toast({ messages, onDismiss }: ToastProps) {
  if (messages.length === 0) return null;

  return (
    <div className="toast-container" aria-label="Notifications">
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
