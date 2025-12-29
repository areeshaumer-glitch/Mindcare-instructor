
import React, { useState } from 'react';
import { X, Bell } from 'lucide-react';

// Reusable Notification Modal Component
const NotificationModal = ({ isOpen, onClose, notifications = [], onMarkAllRead }) => {
  const [activeTab, setActiveTab] = useState('All');

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => n.isNew).length;

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'New') return notification.isNew;
    if (activeTab === 'Unread') return notification.isNew;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-end p-4 z-50"   onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Notification</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm">
              You've {unreadCount > 0 ? `${unreadCount} unread` : 'no unread'} Notifications
            </p>
            <button
              onClick={onMarkAllRead}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Mark all as read
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex space-x-6 border-b border-gray-200">
            {['All', 'New', 'Unread'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 font-medium text-sm transition-colors relative ${
                  activeTab === tab
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {filteredNotifications.map((notification) => (
            <div key={notification.id} className="px-6 py-4 border-b border-gray-50 last:border-b-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center">
                    <Bell className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">
                      {notification.text}
                    </h3>
                    <p className="text-gray-500 text-xs mt-1">
                      {notification.time}
                    </p>
                  </div>
                </div>
                {notification.isNew && (
                  <span className="bg-teal-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    New
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {filteredNotifications.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              <Bell className="mx-auto mb-3 text-gray-300" size={32} />
              <p>No {activeTab.toLowerCase()} notifications</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default NotificationModal;
