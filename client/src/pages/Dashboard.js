import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import {
  getUserProfile,
  getMyBooks,
  deleteBook,
  updateProfile,
  getIncomingSwaps,
  getOutgoingSwaps,
  acceptSwap,
  rejectSwap,
} from '../services/api';
import NotificationPanel from '../components/NotificationPanel';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'books' | 'swaps'
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Profile form state
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [genresText, setGenresText] = useState(''); // comma-separated

  // My Books
  const [myBooks, setMyBooks] = useState([]);

  // Swaps
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [profileRes, myBooksRes, inRes, outRes] = await Promise.allSettled([
          getUserProfile(),
          getMyBooks(),
          getIncomingSwaps(),
          getOutgoingSwaps()
        ]);

        if (profileRes.status === 'fulfilled') {
          const u = profileRes.value.data;
          setUser(u);
          setName(u?.name || '');
          setPhone(u?.phone || '');
          setGenresText((u?.preferredGenres || []).join(', '));
        } else {
          setError('Failed to load user profile.');
        }

        if (myBooksRes.status === 'fulfilled') {
          setMyBooks(myBooksRes.value.data || []);
        } else {
          setError(prev => prev || 'Failed to load your books.');
        }

        if (inRes.status === 'fulfilled') {
          setIncoming(inRes.value.data || []);
        } else {
          setError(prev => prev || 'Failed to load incoming swaps.');
        }

        if (outRes.status === 'fulfilled') {
          setOutgoing(outRes.value.data || []);
        } else {
          setError(prev => prev || 'Failed to load outgoing swaps.');
        }
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [navigate]);

  const handleSaveProfile = async () => {
    setError('');
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        preferredGenres: genresText
          .split(',')
          .map(g => g.trim())
          .filter(Boolean),
      };
      const res = await updateProfile(payload);
      const u = res.data;
      setUser(u);
      setEditMode(false);
      setName(u?.name || '');
      setPhone(u?.phone || '');
      setGenresText((u?.preferredGenres || []).join(', '));
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await deleteBook(bookId);
      setMyBooks(prev => prev.filter(b => b._id !== bookId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete book.');
    }
  };

  const onAcceptSwap = async (id) => {
    try {
      await acceptSwap(id);
      const [inRes, outRes] = await Promise.all([getIncomingSwaps(), getOutgoingSwaps()]);
      setIncoming(inRes.data || []);
      setOutgoing(outRes.data || []);
      alert('Swap accepted! Ownership swapped.');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to accept swap.');
    }
  };

  const onRejectSwap = async (id) => {
    try {
      await rejectSwap(id);
      const [inRes, outRes] = await Promise.all([getIncomingSwaps(), getOutgoingSwaps()]);
      setIncoming(inRes.data || []);
      setOutgoing(outRes.data || []);
      alert('Swap rejected.');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to reject swap.');
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          {error || 'Unable to load dashboard.'}
        </div>
      </div>
    );
  }

  const TabButton = ({ id, children }) => (
    <button
      className={`px-4 py-2 rounded ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  );

  const SwapList = ({ items, incomingMode }) => (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item._id} className="p-4 border rounded bg-white flex justify-between items-center">
          <div>
            <div className="font-semibold">
              {incomingMode
                ? `${item.fromUser?.name || item.fromUser?.email} wants to swap`
                : `You asked ${item.toUser?.name || item.toUser?.email}`}
            </div>
            <div className="text-sm text-gray-700">
              Offer: {item.offeredBook?.title || 'Unknown'} → For: {item.requestedBook?.title || 'Unknown'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Status: {item.status}</div>
          </div>
          {incomingMode && item.status === 'pending' && (
            <div className="flex gap-2">
              <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => onAcceptSwap(item._id)}>Accept</button>
              <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={() => onRejectSwap(item._id)}>Reject</button>
            </div>
          )}
        </div>
      ))}
      {items.length === 0 && <div className="text-gray-500">No requests</div>}
    </div>
  );

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white shadow-lg rounded-lg p-8 mb-6">
              <h2 className="text-3xl font-extrabold text-gray-900">Welcome, {user.name}!</h2>
              <p className="mt-2 text-lg text-gray-600">Manage your profile, books, and swaps.</p>
              {error && (
                <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
            </div>

            <div className="mb-6 flex gap-2">
              <TabButton id="profile">My Profile</TabButton>
              <TabButton id="books">My Books</TabButton>
              <TabButton id="swaps">Swap Activity</TabButton>
            </div>

            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white shadow-lg rounded-lg p-6">
                  {!editMode ? (
                    <div>
                      <div className="text-gray-700">
                        <div><span className="font-medium">Name:</span> {user.name}</div>
                        <div><span className="font-medium">Email:</span> {user.email}</div>
                        {user.phone && <div><span className="font-medium">Phone:</span> {user.phone}</div>}
                        {user.preferredGenres?.length > 0 && (
                          <div><span className="font-medium">Preferred Genres:</span> {user.preferredGenres.join(', ')}</div>
                        )}
                      </div>
                      <button
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
                        onClick={() => setEditMode(true)}
                      >
                        Edit Profile
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input className="mt-1 border rounded p-2 w-full" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email (read-only)</label>
                        <input className="mt-1 border rounded p-2 w-full bg-gray-100" value={user.email} readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input className="mt-1 border rounded p-2 w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Preferred Genres (comma-separated)</label>
                        <input className="mt-1 border rounded p-2 w-full" value={genresText} onChange={(e) => setGenresText(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleSaveProfile}>Save</button>
                        <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => {setEditMode(false); setName(user.name || ''); setPhone(user.phone || ''); setGenresText((user.preferredGenres||[]).join(', '));}}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="md:col-span-1">
                  <NotificationPanel />
                </div>
              </div>
            )}

            {activeTab === 'books' && (
              <div className="bg-white shadow-lg rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">My Books</h3>
                {myBooks.length === 0 ? (
                  <p className="text-gray-500">You haven't added any books yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myBooks.map(book => (
                      <div key={book._id} className="border rounded-lg overflow-hidden shadow">
                        <img
                          src={book.imageURL}
                          alt={book.title}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-4">
                          <h4 className="text-lg font-semibold mb-1">{book.title}</h4>
                          <p className="text-gray-600 mb-2">By {book.author}</p>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500 capitalize">{book.condition}</span>
                            <button
                              onClick={() => handleDeleteBook(book._id)}
                              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'swaps' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white shadow-lg rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Incoming Swap Requests</h3>
                  <SwapList items={incoming} incomingMode />
                </div>
                <div className="bg-white shadow-lg rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Your Swap Requests</h3>
                  <SwapList items={outgoing} incomingMode={false} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;