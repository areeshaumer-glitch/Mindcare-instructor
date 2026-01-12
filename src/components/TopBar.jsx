import React, { useState, useEffect } from 'react';
import images from '../assets/Images';
import NotificationModal from './NotificationModal';
import { Method, callApi } from '../network/NetworkManager';
import { api } from '../network/Environment';
import { useAuthStore } from '../store/authSlice';
import { Menu } from 'lucide-react';

const TopBar = ({ onClick, onMenuClick }) => {
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState(null);
  const userData = useAuthStore((s) => s.userData);
  const token = useAuthStore((s) => s.token);
  const profileVersion = useAuthStore((s) => s.profileVersion);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Notification received', time: 'Today | 09:24 AM', isNew: true },
    { id: 2, text: 'New message from John', time: 'Today | 08:15 AM', isNew: true },
    { id: 3, text: 'System update completed', time: 'Today | 07:30 AM', isNew: true },
    { id: 4, text: 'Payment processed successfully', time: 'Yesterday | 05:45 PM', isNew: false },
    { id: 5, text: 'Weekly report available', time: 'Yesterday | 02:20 PM', isNew: false },
  ]);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isNew: false })));
  };

  const unreadCount = notifications.filter(n => n.isNew).length;

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    void callApi({
      method: Method.GET,
      endPoint: api.instructorProfileMe,
      onSuccess: (res) => {
        if (!isMounted) return;
        const candidate =
          res?.data?.data ||
          res?.data ||
          null;
        setProfile(candidate);
      },
      onError: () => {
        if (!isMounted) return;
        setProfile(null);
      },
    });
    return () => {
      isMounted = false;
    };
  }, [token, profileVersion]);

  const displayName =
    profile?.name ||
    profile?.user?.name ||
    userData?.profile?.fullName ||
    userData?.phone ||
    'Name Here';
  const rawImage = profile?.profileImage || images.defaultAvatar;
  const displayImage = (() => {
    if (!rawImage || typeof rawImage !== 'string') return rawImage;
    if (rawImage.startsWith('blob:') || rawImage.startsWith('data:')) return rawImage;
    try {
      const url = new URL(rawImage, window.location.origin);
      url.searchParams.set('v', String(profileVersion || 0));
      return url.toString();
    } catch {
      const sep = rawImage.includes('?') ? '&' : '?';
      return `${rawImage}${sep}v=${profileVersion || 0}`;
    }
  })();
  const displayRole = 'Instructor';

  return (
    <header className="w-full bg-white shadow px-6 py-3 rounded-[12px] mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center gap-3">
          {onMenuClick ? (
            <button
              type="button"
              onClick={onMenuClick}
              className="min-[650px]:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 text-gray-700"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          ) : null}
          <div className="text-lg font-medium text-gray-800">Hi, {displayName}</div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
          <button
            onClick={onClick}
            className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none"
            type="button"
          >
            <img src={displayImage} className="w-10 h-10 rounded-full" alt="User Avatar" />
            <div className="flex flex-col justify-center min-w-0 max-w-[180px] sm:max-w-none">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs flex justify-start text-green-600 truncate">{displayRole}</p>
            </div>
          </button>

          <button onClick={() => setShowModal(true)} type="button">
            <div className="relative">
              <img src={images.notify} className="w-10 h-8" alt="Notify" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
      <NotificationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
      />
    </header>
  );
};

export default TopBar;
