import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { fetchBooks } from '../services/api';
import SwapRequestButton from '../components/SwapRequestButton';

const Home = () => {
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await fetchBooks();
      setBooks(response.data);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.genre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = !selectedCondition || book.condition === selectedCondition;
    return matchesSearch && matchesCondition;
  });

  const token = localStorage.getItem('token');

  return (
    <div>
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Find and swap your next great read
          </h1>
          <p className="mt-3 text-blue-100">
            Browse community-added books and exchange the ones you’ve finished.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {token ? (
              <>
                <Link to="/add-book" className="bg-white text-blue-700 font-medium px-4 py-2 rounded-lg shadow hover:bg-blue-50">
                  Add Your Book
                </Link>
                <Link to="/dashboard" className="bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow hover:bg-blue-800">
                  Go to Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/signup" className="bg-white text-blue-700 font-medium px-4 py-2 rounded-lg shadow hover:bg-blue-50">
                  Get Started
                </Link>
                <Link to="/login" className="bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow hover:bg-blue-800">
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Main */}
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters card */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                placeholder="Search by title, author, or genre..."
                className="w-full md:flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="w-full md:w-60 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
              >
                <option value="">All Conditions</option>
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="old">Old</option>
              </select>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center text-gray-500 py-12">Loading books...</div>
          ) : filteredBooks.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-2xl font-semibold text-gray-800">No books found</div>
              <p className="mt-2 text-gray-600">Try a different search or add your first book.</p>
              <div className="mt-4">
                {token ? (
                  <Link to="/add-book" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Add a Book
                  </Link>
                ) : (
                  <Link to="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Create an account
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBooks.map(book => (
                <div key={book._id} className="bg-white border rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow">
                  <img src={book.imageURL} alt={book.title} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-1 line-clamp-1">{book.title}</h3>
                    <p className="text-gray-600 mb-1 line-clamp-1">By {book.author}</p>
                    <p className="text-gray-500 mb-2">Genre: {book.genre}</p>
                    <p className="text-gray-500">Condition: {book.condition}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to={`/book/${book._id}`}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
                      >
                        View Details
                      </Link>
                      <div>
                        <SwapRequestButton requestedBookId={book._id} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;