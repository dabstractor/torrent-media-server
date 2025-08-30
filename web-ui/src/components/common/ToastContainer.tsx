import React from 'react'
import { useNotifications } from '@/context/NotificationContext'
import ToastNotification from './ToastNotification'

const ToastContainer: React.FC = () => {
  const { notifications } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div 
      aria-live="polite"
      aria-atomic="true"
      className="fixed inset-0 z-[9999] pointer-events-none"
    >
      <div className="absolute top-4 right-4 space-y-4">
        {notifications.map((notification) => (
          <ToastNotification 
            key={notification.id} 
            notification={notification} 
          />
        ))}
      </div>
    </div>
  )
}

export default ToastContainer