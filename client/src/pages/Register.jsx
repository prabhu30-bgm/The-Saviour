import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Users, LifeBuoy, AlertCircle } from 'lucide-react';

const Register = () => {
  const { register: signup } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
      role: 'user'
    }
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    setErrorMsg('');
    setLoading(true);

    const result = await signup({
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      password: data.password,
      confirmPassword: data.confirmPassword,
      role: data.role
    });

    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8 py-12">
      <div className="max-w-4xl w-full min-h-[650px] bg-white rounded-[32px] shadow-2xl flex overflow-hidden border border-slate-100">
        
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

        {/* Right Side Panel: Registration Form (Scrollable container for multiple inputs) */}
        <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center relative overflow-y-auto max-h-[700px]">
          {/* Decorative background details */}
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-green-200/10 rounded-full blur-2xl"></div>

          <div className="relative">
            {/* Header */}
            <div className="mb-6">
              <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-2xl text-primary inline-block mb-3">
                <LifeBuoy size={24} className="stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Create Account</h2>
              <p className="text-slate-500 text-xs mt-1">Join The Saviour Crisis coordination platform</p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-655 flex items-start space-x-2 text-xs font-semibold">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-xs">
              {/* Role selector */}
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Select Your Role</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'user', label: 'User / Reporter', icon: Users },
                    { id: 'volunteer', label: 'Response Volunteer', icon: LifeBuoy }
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
                        <Icon size={18} className="mb-1" />
                        <span className="text-[10px] font-semibold">{roleOption.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-slate-550 text-[10px] font-bold uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition text-xs"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && <p className="text-red-555 mt-1 text-[10px]">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-slate-550 text-[10px] font-bold uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition text-xs"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                />
                {errors.email && <p className="text-red-555 mt-1 text-[10px]">{errors.email.message}</p>}
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-slate-550 text-[10px] font-bold uppercase tracking-wider mb-1">Mobile Number</label>
                <input
                  type="text"
                  placeholder="10-digit number"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition text-xs"
                  {...register('mobile', {
                    required: 'Mobile number is required',
                    pattern: {
                      value: /^\d{10}$/,
                      message: 'Mobile number must be exactly 10 digits'
                    }
                  })}
                />
                {errors.mobile && <p className="text-red-555 mt-1 text-[10px]">{errors.mobile.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-550 text-[10px] font-bold uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-3.5 pr-12 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition text-xs"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters long'
                      }
                    })}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 transition"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-555 mt-1 text-[10px]">{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-slate-550 text-[10px] font-bold uppercase tracking-wider mb-1">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition text-xs"
                  {...register('confirmPassword', {
                    required: 'Confirm password is required',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                />
                {errors.confirmPassword && <p className="text-red-555 mt-1 text-[10px]">{errors.confirmPassword.message}</p>}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-light disabled:bg-green-700 text-white font-extrabold py-2.5 rounded-xl shadow-sm hover:shadow active:translate-y-px transition flex items-center justify-center space-x-2 mt-3 text-xs uppercase tracking-wider"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4.5 w-4.5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>

            {/* Redirect to login */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-slate-500 text-xs">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:text-primary-light font-bold transition ml-1">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
