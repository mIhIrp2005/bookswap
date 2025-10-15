import React, { useEffect, useState } from 'react';
import { getMyBooks, getBookById, createSwap } from '../services/api';

function SwapRequestButton({ requestedBookId }) {
  const [open, setOpen] = useState(false);
  const [myBooks, setMyBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [loading, setLoading] = useState(false);
  const [ownerId, setOwnerId] = useState(null);
  const [error, setError] = useState('');

  const isAuthed = typeof window !== 'undefined' && !!localStorage.getItem('token');

  // Always call hooks
  useEffect(() => {
    if (!open || !isAuthed) return;
    (async () => {
      try {
        const [mineRes, bookRes] = await Promise.all([
          getMyBooks(),
          getBookById(requestedBookId),
        ]);
        setMyBooks(mineRes.data || []);
        const b = bookRes.data;
        const toUserId = b?.owner?.id || b?.owner?._id || b?.ownerId?._id;
        setOwnerId(toUserId || null);
      } catch (e) {
        setError('Failed to load data for swap request.');
      }
    })();
  }, [open, requestedBookId, isAuthed]);

  const submit = async () => {
    if (!selectedBookId) {
      setError('Please select one of your books to offer.');
      return;
    }
    if (!ownerId) {
      setError('Cannot find the owner of the requested book.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createSwap({
        offeredBook: selectedBookId,
        requestedBook: requestedBookId,
        toUser: ownerId,
      });
      alert('Swap request sent!');
      setOpen(false);
      setSelectedBookId('');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to create swap request.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // If not signed in, just render nothing (after hooks have been set up)
  if (!isAuthed) {
    return null;
  }

  return (
    <div className="mt-2">
      {!open ? (
        <button
          className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          onClick={() => setOpen(true)}
        >
          Request Swap
        </button>
      ) : (
        <div className="border p-3 rounded bg-white shadow-sm">
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Offer one of your books</label>
            <select
              className="mt-1 w-full border rounded p-2"
              value={selectedBookId}
              onChange={e => setSelectedBookId(e.target.value)}
            >
              <option value="">Select a book...</option>
              {myBooks.map(b => (
                <option key={b._id} value={b._id}>
                  {b.title} — {b.author}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

          <div className="flex gap-2">
            <button
              disabled={loading}
              onClick={submit}
              className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setError('');
              }}
              className="bg-gray-200 px-3 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SwapRequestButton;
