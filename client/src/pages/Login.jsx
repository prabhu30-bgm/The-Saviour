import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Shield, Users, LifeBuoy, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
      role: 'user'
    }
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    setLoading(true);
    const result = await login(data.email, data.password, data.role);
    setLoading(false);

    if (result.success) {
      const allowedPaths = {
        admin: '/admin',
        volunteer: '/volunteer',
        user: '/user'
      };

      const from = location.state?.from?.pathname || '/';
      if (from !== '/' && from.startsWith(allowedPaths[data.role])) {
        navigate(from, { replace: true });
      } else {
        navigate(allowedPaths[data.role]);
      }
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-4xl w-full min-h-[600px] bg-white rounded-[32px] shadow-2xl flex overflow-hidden border border-slate-100">

        {/* Left Side Panel: Image, tint, and text overlay */}
        <div
          className="hidden md:flex md:w-1/2 relative bg-cover bg-center flex-col justify-end p-10 text-white"
          style={{ backgroundImage: `url('/the_saviour_login_bg.png')` }}
        >
          {/* Dark overlay tint */}
          <div className="absolute inset-0 bg-slate-950/40 z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-slate-950/10 z-10"></div>

          {/* Text block overlay */}
          <div className="relative z-20 space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight">The Saviour</h1>
            <p className="text-xs text-slate-200 font-medium leading-relaxed max-w-sm">
              Community-Based Disaster Response & Resource Coordination System
            </p>
          </div>
        </div>

        {/* Right Side Panel: Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative">
          {/* Decorative background details */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>

          <div className="relative">
            {/* Header */}
            <div className="mb-8">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary inline-block mb-3">
                <LifeBuoy size={28} className="animate-spin-slow stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Welcome Back</h2>
              <p className="text-slate-500 text-xs mt-1">Sign in to coordinate emergency operations</p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-250 rounded-xl text-red-650 flex items-start space-x-2 text-xs font-semibold">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Role Selector */}
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">Select Your Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'user', label: 'User', icon: Users },
                    { id: 'volunteer', label: 'Volunteer', icon: LifeBuoy },
                    { id: 'admin', label: 'Admin', icon: Shield }
                  ].map((roleOption) => {
                    const Icon = roleOption.icon;
                    return (
                      <label
                        key={roleOption.id}
                        className="cursor-pointer flex flex-col items-center justify-center p-2.5 border border-slate-200 bg-slate-50/50 rounded-xl hover:bg-slate-105/50 hover:border-slate-350 transition-all text-slate-500 has-[:checked]:border-primary has-[:checked]:bg-green-50 has-[:checked]:text-primary-dark"
                      >
                        <input
                          type="radio"
                          value={roleOption.id}
                          className="sr-only"
                          {...register('role', { required: true })}
                        />
                        <Icon size={16} className="mb-1" />
                        <span className="text-[10px] font-semibold">{roleOption.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-slate-550 text-[10px] font-bold uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition text-xs"
                  {...register('email', {
                    required: 'Email address is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                />
                {errors.email && <p className="text-red-550 text-[10px] mt-1">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-slate-550 text-[10px] font-bold uppercase tracking-wider">Password</label>
                  <Link to="/forgot-password" className="text-primary hover:text-primary-light text-[10px] font-bold transition">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-4 pr-12 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition text-xs"
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 transition"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-555 text-[10px] mt-1">{errors.password.message}</p>}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-light disabled:bg-green-700 text-white font-extrabold py-2.5 rounded-xl shadow-sm hover:shadow active:translate-y-px transition flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4.5 w-4.5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Redirect to signup */}
            <div className="mt-8 pt-5 border-t border-slate-100 text-center">
              <p className="text-slate-500 text-xs">
                Need to raise an emergency?{' '}
                <Link to="/register" className="text-primary hover:text-primary-light font-bold transition ml-1">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
