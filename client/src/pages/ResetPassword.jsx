import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const token = params.get('token');
  const email = params.get('email');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token || !email) {
      setError('This password reset link is incomplete. Request a new one.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { email, token, password, confirmPassword });
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
        <h1 className="text-2xl font-extrabold text-slate-800">Choose a new password</h1>
        <p className="mt-2 text-sm text-slate-500">Use at least six characters.</p>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">New password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="6" required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Confirm password
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength="6" required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary py-2.5 font-bold text-white disabled:opacity-60">
            {loading ? 'Resetting password…' : 'Reset password'}
          </button>
        </form>
        <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">Back to sign in</Link>
      </section>
    </main>
  );
};

export default ResetPassword;
