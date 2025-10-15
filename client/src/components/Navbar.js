import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <nav className="bg-blue-600 py-3 px-4 sticky top-0 z-50 shadow">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    <Link to="/" className="text-white text-2xl font-bold">BookSwap</Link>

                    {/* Right side links inline with brand */}
                    <div className="flex items-center gap-6">
                        {token ? (
                            <>
                                <Link to="/add-book" className="text-white hover:text-blue-200 text-base">Add Book</Link>
                                <Link to="/dashboard" className="text-white hover:text-blue-200 text-base">Dashboard</Link>
                                <button onClick={handleLogout} className="text-white hover:text-blue-200 text-base">Logout</button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-white hover:text-blue-200 text-base">Login</Link>
                                <Link to="/signup" className="text-white hover:text-blue-200 text-base">Sign Up</Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;