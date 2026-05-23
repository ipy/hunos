import React from 'react';
import { useTheme } from '@/theme/ThemeContext';
import { useUIStore } from '@/store/uiStore';

export function ToastContainer() {
  const theme = useTheme();
  const toasts = useUIStore(s => s.toasts);
  const dismissToast = useUIStore(s => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 88,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => dismissToast(toast.id)}
          style={{
            padding: '10px 20px',
            borderRadius: 22,
            backgroundColor: toast.type === 'error' ? theme.colors.danger :
              toast.type === 'success' ? theme.colors.success :
              (theme.isDark ? 'rgba(60,60,67,0.9)' : 'rgba(50,50,50,0.88)'),
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: theme.fontWeight.medium,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            animation: 'toastSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: 'auto',
            letterSpacing: -0.1,
            whiteSpace: 'nowrap',
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
