import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getBookById } from '../services/api';
import SwapRequestButton from '../components/SwapRequestButton';

function BookDetails() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const { data } = await getBookById(id);
        setBook(data);
      } catch (error) {
        setError('Failed to fetch book details.');
      }
    };
    fetchBook();
  }, [id]);

  if (!book) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="md:flex">
            <div className="md:flex-shrink-0">
              <img 
                className="h-96 w-full object-cover md:w-64" 
                src={book.imageURL} 
                alt={book.title} 
              />
            </div>
            <div className="p-8">
              <div className="uppercase tracking-wide text-sm text-blue-500 font-semibold">
                {book.genre}
              </div>
              <h1 className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                {book.title}
              </h1>
              <p className="mt-4 text-lg text-gray-600">
                by {book.author}
              </p>
              <p className="mt-6 text-gray-500">
                {book.description}
              </p>

              <div className="mt-6">
                <div className="flex items-center">
                  <span className="text-gray-600 font-semibold">Condition:</span>
                  <span className="ml-2 capitalize px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {book.condition}
                  </span>
                </div>
                {/* Unified Request Swap behavior */}
                <div className="mt-4">
                  <SwapRequestButton requestedBookId={id} />
                </div>
                <div className="mt-4">
                  <span className="text-gray-600 font-semibold">Owner:</span>
                  <span className="ml-2 text-gray-800">{book.owner?.name || book.owner?.email}</span>
                </div>
              </div>

              {error && (
                <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookDetails;