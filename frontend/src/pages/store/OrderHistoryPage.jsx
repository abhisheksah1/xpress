import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');

  const track = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({ orderNumber: orderNumber.trim() });
    if (email.trim()) params.set('email', email.trim());
    navigate(`/track?${params.toString()}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      <p className="text-gray-500 mb-6">
        Login to view your order history, or track a guest order below.
      </p>
      <div className="card mb-8">
        <h2 className="font-semibold mb-4">Track guest order</h2>
        <form onSubmit={track} className="flex flex-col sm:flex-row gap-3">
          <input
            className="input-field"
            placeholder="Order number (e.g. KO-...)"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="email"
            placeholder="Email used at checkout"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn-primary whitespace-nowrap">Track</button>
        </form>
        <p className="text-xs text-gray-500 mt-3">
          Or open the{' '}
          <Link to="/track" className="text-primary-600 hover:underline">tracking page</Link>{' '}
          directly if you have a link from the store.
        </p>
      </div>
    </div>
  );
}
