import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="inline-flex p-4 bg-red-500/10 rounded-full text-red-500">
          <ShieldAlert size={48} />
        </div>
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Access Denied</h1>
        <p className="text-slate-400">
          You do not have the security clearance required to access this dashboard resource.
        </p>
        <div>
          <Link
            to="/"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg transition"
          >
            Return to Safety
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
