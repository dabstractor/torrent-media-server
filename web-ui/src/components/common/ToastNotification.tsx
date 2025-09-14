import React, { useEffect } from 'react'
import { Notification, useNotifications } from '@/context/NotificationContext'

interface ToastNotificationProps {
  notification: Notification
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ notification }) => {
  const { removeNotification } = useNotifications()
  
  useEffect(() => {
    if (!notification.persistent) {
      const duration = notification.duration || 5000;
      console.log(`Setting auto-dismiss timer for notification ${notification.id} (${duration}ms)`);

      const timer = setTimeout(() => {
        console.log(`Auto-dismissing notification ${notification.id}`);
        removeNotification(notification.id);
      }, duration);

      return () => {
        console.log(`Clearing timer for notification ${notification.id}`);
        clearTimeout(timer);
      };
    }
  }, [notification.id, notification.persistent, notification.duration, removeNotification])

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-100 border-green-400'
      case 'error':
        return 'bg-red-100 border-red-400'
      case 'warning':
        return 'bg-yellow-100 border-yellow-400'
      case 'info':
        return 'bg-blue-100 border-blue-400'
      default:
        return 'bg-gray-100 border-gray-400'
    }
  }

  const getTitleColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-800'
      case 'error':
        return 'text-red-800'
      case 'warning':
        return 'text-yellow-800'
      case 'info':
        return 'text-blue-800'
      default:
        return 'text-gray-800'
    }
  }

  const getMessageColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-700'
      case 'error':
        return 'text-red-700'
      case 'warning':
        return 'text-yellow-700'
      case 'info':
        return 'text-blue-700'
      default:
        return 'text-gray-700'
    }
  }

  return (
    <div className={`min-w-80 max-w-md w-full rounded-lg shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border ${getBackgroundColor()}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1 pt-0.5 min-w-0">
            <p className={`text-sm font-medium ${getTitleColor()} break-words`}>
              {notification.title}
            </p>
            {notification.message && (
              <p className={`mt-1 text-sm ${getMessageColor()} break-words`}>
                {notification.message}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              type="button"
              className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors p-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeNotification(notification.id);
              }}
              aria-label="Close notification"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ToastNotification