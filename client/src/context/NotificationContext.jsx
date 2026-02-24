import { AlertCircle, CheckCircle, Info, ShieldCheck } from 'lucide-react';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

/**
 * @file NotificationContext.jsx
 * @description Context for managing global notifications (toasts).
 */

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, variant = 'info') => {
    const id = Date.now();
    const notification = { id, message, variant };
    setNotifications((prev) => [...prev, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (variant) => {
    switch (variant) {
      case 'success': return <CheckCircle size={18} />;
      case 'danger': return <AlertCircle size={18} />;
      case 'warning': return <AlertCircle size={18} />;
      case 'info':
      default: return <Info size={18} />;
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        {notifications.map((n) => (
          <Toast 
            key={n.id} 
            bg={n.variant} 
            onClose={() => removeNotification(n.id)}
            className="border-0 shadow-lg text-white mb-2"
          >
            <Toast.Header closeButton className={`bg-${n.variant} text-white border-0`}>
              <strong className="me-auto d-flex align-items-center gap-2">
                {getIcon(n.variant)}
                {n.variant.toUpperCase()}
              </strong>
            </Toast.Header>
            <Toast.Body>{n.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </NotificationContext.Provider>
  );
};
