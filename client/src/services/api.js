import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

API.interceptors.request.use((req) => {
    if (localStorage.getItem('token')) {
        req.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
    }
    return req;
});

export const login = (formData) => API.post('/auth/login', formData);
export const register = (formData) => API.post('/auth/register', formData);

export const fetchBooks = () => API.get('/books/all');
export const getBookById = (id) => API.get(`/books/${id}`);
export const addBook = (bookData) => API.post('/books/add', bookData);
export const updateBook = (id, updatedBook) => API.put(`/books/${id}`, updatedBook);
export const deleteBook = (id) => API.delete(`/books/${id}`);
export const getMyBooks = () => API.get('/books/mine');

// Removed legacy request endpoints (requests/*) in favor of swap endpoints below
// export const getSwapRequests = () => API.get('/requests');
// export const sendSwapRequest = (bookId) => API.post('/requests/send', { bookId });
// export const acceptSwapRequest = (id) => API.put(`/requests/${id}/accept`);
// export const declineSwapRequest = (id) => API.put(`/requests/${id}/decline`);

// Swaps (new)
export const createSwap = (payload) => API.post('/swaps', payload);
export const getIncomingSwaps = () => API.get('/swaps/incoming');
export const getOutgoingSwaps = () => API.get('/swaps/outgoing');
export const acceptSwap = (id) => API.post(`/swaps/${id}/accept`);
export const rejectSwap = (id) => API.post(`/swaps/${id}/reject`);

export const getUserProfile = () => API.get('/users/profile');
export const updateProfile = (payload) => API.put('/users/profile', payload);