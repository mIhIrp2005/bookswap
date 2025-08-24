import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-white text-2xl font-bold">BookSwap</Link>
        <div className="flex space-x-4">
          {token ? (
            <>
              <Link to="/add-book" className="text-white hover:text-blue-200">Add Book</Link>
              <Link to="/dashboard" className="text-white hover:text-blue-200">Dashboard</Link>
              <button onClick={handleLogout} className="text-white hover:text-blue-200">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-white hover:text-blue-200">Login</Link>
              <Link to="/signup" className="text-white hover:text-blue-200">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;