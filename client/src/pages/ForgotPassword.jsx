import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/auth/forgot-password', { email });
      const resetUrl = response.data.data?.resetUrl;
      setMessage(resetUrl
        ? 'Development reset link created. Open it to choose a new password.'
        : response.data.message);
      if (resetUrl) window.location.assign(resetUrl);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create a password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
        <h1 className="text-2xl font-extrabold text-slate-800">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-500">Enter your account email to receive a reset link.</p>
        {message && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary py-2.5 font-bold text-white disabled:opacity-60">
            {loading ? 'Creating reset link…' : 'Send reset link'}
          </button>
        </form>
        <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">Back to sign in</Link>
      </section>
    </main>
  );
};

export default ForgotPassword;
