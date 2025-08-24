import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { fetchBooks } from '../services/api';
import SwapRequestButton from '../components/SwapRequestButton';

const Home = () => {
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const response = await fetchBooks();
      setBooks(response.data);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.genre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = !selectedCondition || book.condition === selectedCondition;
    return matchesSearch && matchesCondition;
  });

  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search by title, author, or genre..."
            className="w-full p-2 border rounded-lg mb-4"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="w-full p-2 border rounded-lg"
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
          >
            <option value="">All Conditions</option>
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="old">Old</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map(book => (
            <div key={book._id} className="border rounded-lg overflow-hidden shadow-lg">
              <img src={book.imageURL} alt={book.title} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{book.title}</h3>
                <p className="text-gray-600 mb-2">By {book.author}</p>
                <p className="text-gray-500 mb-2">Genre: {book.genre}</p>
                <p className="text-gray-500 mb-4">Condition: {book.condition}</p>
                <Link
                  to={`/book/${book._id}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block hover:bg-blue-700"
                >
                  View Details
                </Link>
                <div className="mt-2">
                  <SwapRequestButton requestedBookId={book._id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;