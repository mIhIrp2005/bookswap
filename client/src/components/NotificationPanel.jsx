import React, { useEffect, useState } from 'react';
import { getNotifications } from '../services/api';

function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getNotifications();
        setNotifications(res.data || []);
      } catch (e) {
        setError('Failed to load notifications.');
      }
    })();
  }, []);

  return (
    <div className="border rounded p-4 bg-white shadow-md w-full md:w-96">
      <h2 className="text-lg font-bold mb-3">Notifications</h2>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      {notifications.length === 0 ? (
        <p className="text-gray-500 text-sm">No notifications yet.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n, i) => (
            <li key={n._id || i} className="border-b pb-2 text-sm">
              {n.message}
              <div className="text-xs text-gray-500 mt-1">
                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NotificationPanel;