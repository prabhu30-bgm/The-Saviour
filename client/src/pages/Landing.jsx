import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  LifeBuoy, 
  Users, 
  ShieldAlert, 
  MapPin, 
  Phone, 
  Mail, 
  Map, 
  ArrowRight, 
  HeartHandshake, 
  Sparkles, 
  Award, 
  Clock, 
  CheckCircle, 
  ChevronDown, 
  Activity, 
  Compass, 
  AlertTriangle,
  Send,
  X
} from 'lucide-react';

const Landing = () => {
  const { user } = useAuth();

  // Public stats state
  const [stats, setStats] = useState({
    totalUsers: 12,
    totalVolunteers: 8,
    totalRequests: 24,
    completedRequests: 19,
    successRate: 85
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // SOS Modal state
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosSuccess, setSosSuccess] = useState(false);
  const [sosError, setSosError] = useState('');
  const [sosForm, setSosForm] = useState({
    name: '',
    mobile: '',
    category: 'medical',
    description: '',
    latitude: '',
    longitude: ''
  });

  // FAQ Accordion state
  const [activeFaq, setActiveFaq] = useState(null);

  // Contact Form state
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Fetch stats from backend
  const fetchStats = async () => {
    try {
      const res = await api.get('/emergencies/public-stats');
      if (res.data.status === 'success') {
        setStats(res.data.data);
      }
    } catch (err) {
      console.warn('Could not retrieve live landing stats from API, using default/mock values.', err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // SOS Location detection
  const handleAcquireLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSosForm(prev => ({
            ...prev,
            latitude: pos.coords.latitude.toFixed(6),
            longitude: pos.coords.longitude.toFixed(6)
          }));
        },
        (err) => {
          console.error(err);
          alert('Could not acquire your coordinates. Please enter them manually.');
        }
      );
    } else {
      alert('Your browser does not support Geolocation.');
    }
  };

  // Submit SOS Alert
  const handleSosSubmit = async (e) => {
    e.preventDefault();
    setSosError('');
    setSosSuccess(false);

    // Form validation
    if (!sosForm.name.trim() || !sosForm.mobile.trim() || !sosForm.description.trim() || !sosForm.latitude || !sosForm.longitude) {
      setSosError('All fields including location coordinates are required.');
      return;
    }

    if (!/^\d{10}$/.test(sosForm.mobile)) {
      setSosError('Mobile number must be exactly 10 digits.');
      return;
    }

    setSosLoading(true);
    try {
      const res = await api.post('/emergencies/guest', {
        name: sosForm.name,
        mobile: sosForm.mobile,
        category: sosForm.category,
        description: sosForm.description,
        latitude: parseFloat(sosForm.latitude),
        longitude: parseFloat(sosForm.longitude)
      });

      if (res.data.status === 'success') {
        setSosSuccess(true);
        setSosForm({
          name: '',
          mobile: '',
          category: 'medical',
          description: '',
          latitude: '',
          longitude: ''
        });
        // Refresh landing stats
        fetchStats();
      }
    } catch (err) {
      setSosError(err.response?.data?.message || 'Failed to submit SOS alert. Please try again.');
    } finally {
      setSosLoading(false);
    }
  };

  // Scroll to section helper
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white text-slate-800 min-h-screen relative font-sans">
      
      {/* 1. Sticky Navigation Bar */}
      <nav className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 py-4 px-6 z-40 shadow-sm transition">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <LifeBuoy className="text-primary h-6.5 w-6.5 stroke-[2.5] animate-spin-slow" />
            <span className="font-extrabold text-xl tracking-tight text-primary-dark">
              The Saviour
            </span>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center space-x-7 text-sm font-semibold text-slate-600">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-primary transition">Home</button>
            <button onClick={() => scrollToSection('about')} className="hover:text-primary transition">About</button>
            <button onClick={() => scrollToSection('services')} className="hover:text-primary transition">Services</button>
            <button onClick={() => scrollToSection('impact')} className="hover:text-primary transition">Impact</button>
            <button onClick={() => scrollToSection('volunteer')} className="hover:text-primary transition">Volunteers</button>
            <button onClick={() => scrollToSection('contact')} className="hover:text-primary transition">Contact</button>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3">
            {user ? (
              <Link 
                to={user.role === 'admin' ? '/admin' : user.role === 'volunteer' ? '/volunteer' : '/user'} 
                className="bg-primary hover:bg-primary-light text-white font-bold px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition text-xs flex items-center space-x-1.5"
              >
                <span>Dashboard</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-primary font-semibold text-xs transition px-3 py-2">
                  Sign In
                </Link>
                <Link to="/register" className="bg-primary hover:bg-primary-light text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm hover:shadow transition">
                  Join Us
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden py-20 px-6 border-b border-slate-50 bg-gradient-to-b from-green-50/30 to-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6 text-left relative z-10">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary-dark rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles size={12} />
              <span>Real-Time Crisis Management</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Connecting Communities.<br />
              <span className="text-primary">Saving Lives.</span>
            </h1>

            <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-lg">
              The Saviour is a modern emergency response platform coordinating rescue efforts in real time. We bridge the gap between people in danger, active community volunteers, and emergency administrative dispatchers during disasters.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              {user ? (
                <Link 
                  to={user.role === 'user' ? '/user' : '/'} 
                  className="bg-primary hover:bg-primary-light text-white font-bold px-6 py-3 rounded-xl shadow-md transition text-sm flex items-center space-x-2"
                >
                  <span>Request Emergency Assistance</span>
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <>
                  <Link 
                    to="/login"
                    className="bg-primary hover:bg-primary-light text-white font-bold px-6 py-3 rounded-xl shadow-md transition text-sm"
                  >
                    Request Help
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3 rounded-xl transition text-sm"
                  >
                    Become a Volunteer
                  </Link>
                </>
              )}
              
              {/* Prominent SOS Hero Button */}
              <button
                onClick={() => setIsSosOpen(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-6 py-3 rounded-xl shadow-lg shadow-red-500/20 animate-pulse transition text-sm uppercase tracking-wider border border-red-500"
              >
                🚨 SOS Emergency Request
              </button>
            </div>
          </div>

          {/* Hero Image / Graphic overlay */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute top-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10"></div>
            <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-green-200/20 rounded-full blur-3xl -z-10"></div>
            
            <div className="bg-white border border-slate-100 shadow-2xl p-6 rounded-3xl w-full max-w-md space-y-4 relative">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 bg-red-500 rounded-full animate-ping"></span>
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Live Incident Feed</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Chennai operations</span>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-100/50 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-red-700">
                    <span>Medical Emergency</span>
                    <span>1 min ago</span>
                  </div>
                  <p className="text-slate-600">First-responder dispatched near Adyar sector.</p>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-100/50 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-blue-700">
                    <span>Flood Rescue Operation</span>
                    <span>Active</span>
                  </div>
                  <p className="text-slate-600">Volunteer Jane Smith is routing to incident point.</p>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-100/50 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Rescue Request Resolved</span>
                    <span>Success</span>
                  </div>
                  <p className="text-slate-600">Critical fire safety check marked complete.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Live Platform Statistics */}
      <section className="py-12 bg-slate-50 border-y border-slate-100 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          
          <div className="space-y-1.5 p-4">
            <h3 className="text-4xl font-extrabold text-slate-900 font-mono">
              {statsLoading ? '...' : `${stats.completedRequests}`}
            </h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Completed Rescues</p>
          </div>

          <div className="space-y-1.5 p-4">
            <h3 className="text-4xl font-extrabold text-primary font-mono">
              {statsLoading ? '...' : `${stats.totalVolunteers}`}
            </h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Volunteers</p>
          </div>

          <div className="space-y-1.5 p-4">
            <h3 className="text-4xl font-extrabold text-slate-900 font-mono">
              {statsLoading ? '...' : `${stats.totalUsers}`}
            </h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Users Registered</p>
          </div>

          <div className="space-y-1.5 p-4">
            <h3 className="text-4xl font-extrabold text-emerald-600 font-mono">
              {statsLoading ? '...' : `${stats.successRate}%`}
            </h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Resolution Success</p>
          </div>

        </div>
      </section>

      {/* 4. About The Saviour */}
      <section id="about" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-green-100 text-primary-dark rounded-full text-xs font-bold uppercase">
              <HeartHandshake size={12} />
              <span>Who We Are</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Community-Driven Crisis Response
            </h2>
            
            <p className="text-slate-500 text-sm leading-relaxed">
              Disasters demand immediate action. Often, official services are bottlenecked during heavy emergencies. **The Saviour** coordinates local communities so citizens can help each other under a unified, real-time tracking network.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <Compass className="text-primary" size={24} />
                <h4 className="font-bold text-slate-800 text-sm">Real-Time Routing</h4>
                <p className="text-slate-500 text-xs leading-normal">Volunteers receive precise live map coordinate coordinates to navigate.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <CheckCircle className="text-primary" size={24} />
                <h4 className="font-bold text-slate-800 text-sm">Approved Roster</h4>
                <p className="text-slate-500 text-xs leading-normal">Admins manually verify volunteers to ensure professionalism.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <div className="bg-emerald-950 text-emerald-100 p-8 rounded-3xl shadow-xl space-y-4 text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 -translate-y-8"></div>
              <h3 className="text-xl font-bold">Our Vision</h3>
              <p className="text-emerald-350 text-xs leading-relaxed">
                To build resilient neighborhoods where no emergency alert goes unanswered, bridging technological accessibility with local civic duty.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-100 border border-slate-200/50 rounded-2xl text-center">
                <p className="text-3xl font-extrabold text-slate-800">10M</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Average response (sec)</p>
              </div>
              <div className="p-6 bg-slate-100 border border-slate-200/50 rounded-2xl text-center">
                <p className="text-3xl font-extrabold text-primary">100%</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Free & Open Source</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. What We Do */}
      <section id="services" className="py-20 bg-slate-50 border-y border-slate-100 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-green-100 text-primary-dark rounded-full text-xs font-bold uppercase">
              <Activity size={12} />
              <span>Features</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Our Core Services</h2>
            <p className="text-slate-500 text-xs max-w-md mx-auto">
              Equipped with real-time operations dashboards and socket notification updates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Emergency Dispatch', desc: 'Allows victims to register hazard points, category, severity, and uploads.', icon: ShieldAlert },
              { title: 'Volunteer Assignments', desc: 'Admins verify incidents and dispatch nearby responders instantly.', icon: HeartHandshake },
              { title: 'Real-Time Tracking', desc: 'Streams live coordinates of volunteers moving on operations maps.', icon: Map },
              { title: 'Instant Sockets Alerts', desc: 'Updates statuses, cancellations, or completions instantly.', icon: LifeBuoy },
              { title: 'Guest SOS Assistance', desc: 'Provides anonymous SOS triggers with coordinates capture.', icon: AlertTriangle },
              { title: 'Operations Analytics', desc: 'CSS-breakdowns of severities and logs for auditing.', icon: Users }
            ].map((srv, idx) => {
              const Icon = srv.icon;
              return (
                <div key={idx} className="bg-white border border-slate-200/60 p-6 rounded-2xl text-left hover:shadow-lg transition-all glow-card duration-300">
                  <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-xl inline-block mb-4">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-2">{srv.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{srv.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 6. How It Works */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-12">
          
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">How It Works</h2>
            <p className="text-slate-500 text-xs max-w-md mx-auto">
              Our end-to-end incident lifecycle is fully integrated in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {[
              { step: '01', title: 'Raise Incident Alert', desc: 'Victim/Guest pins a location and registers alert details.' },
              { step: '02', title: 'Admin Dispatches', desc: 'Admins evaluate reports and assign appropriate volunteers.' },
              { step: '03', title: 'Volunteer Accepts', desc: 'Responders accept assignment and share live coordinates.' },
              { step: '04', title: 'Operation Solved', desc: 'Responders complete mission and upload resolution reports.' }
            ].map((step, idx) => (
              <div key={idx} className="space-y-4 text-center relative group">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center mx-auto border border-primary/20 group-hover:bg-primary group-hover:text-white transition duration-300">
                  {step.step}
                </div>
                <h3 className="font-bold text-slate-800 text-sm">{step.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed px-4">{step.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 7. Impact Section */}
      <section id="impact" className="py-20 bg-emerald-950 text-white px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12 items-center text-left">
          
          <div className="space-y-4 lg:col-span-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/10 text-emerald-350 border border-white/10 rounded-full text-xs font-bold uppercase">
              <Award size={12} />
              <span>Safety Impact</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Measurable Results</h2>
            <p className="text-emerald-300 text-xs leading-relaxed">
              We track operational logs to ensure response safety parameters remain high across all coverages.
            </p>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-2">
              <Clock className="text-emerald-400" size={24} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">Average ETA</h4>
              <p className="text-3xl font-extrabold">8.5 Mins</p>
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-2">
              <CheckCircle className="text-emerald-400" size={24} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">Rescues Finished</h4>
              <p className="text-3xl font-extrabold">{stats.completedRequests}</p>
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-2">
              <Users className="text-emerald-400" size={24} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">Active Duty</h4>
              <p className="text-3xl font-extrabold">{stats.totalVolunteers}</p>
            </div>
          </div>

        </div>
      </section>

      {/* 8. Volunteer Recruitment Section */}
      <section id="volunteer" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50/20 border border-green-100 rounded-3xl p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center text-left">
          <div className="space-y-5">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Ready to Protect Your Neighborhood?
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              Become an approved first responder volunteer. Receive localized assignments, coordinate rescue tracking, and help build community resilience.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li className="flex items-center space-x-2">
                <CheckCircle size={14} className="text-primary shrink-0" />
                <span>Receive free emergency first-aid resource guidelines.</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle size={14} className="text-primary shrink-0" />
                <span>Gain access to live admin coordinates dispatch feeds.</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle size={14} className="text-primary shrink-0" />
                <span>Coordinate with NGOs and public emergency teams.</span>
              </li>
            </ul>
          </div>
          <div className="flex justify-center lg:justify-end">
            <Link 
              to="/register" 
              className="bg-primary hover:bg-primary-light text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition text-sm flex items-center space-x-2"
            >
              <span>Join as Volunteer</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Testimonials */}
      <section className="py-20 bg-slate-50 border-y border-slate-100 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-slate-900">Platform Testimonials</h2>
            <p className="text-slate-500 text-xs">Hear from rescue coordinators and helped citizens.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah Connor', role: 'User (Flood Area)', text: 'The Saviour was a lifesaver. I raised a flood SOS and volunteer Jane arrived with medical support within minutes.', rating: 5 },
              { name: 'David G.', role: 'Admin Organizer', text: 'Tracking volunteer locations live during operations makes coordination a breeze. Excellent dashboard.', rating: 5 },
              { name: 'Mark Vance', role: 'Active Volunteer', text: 'Receiving SMS/Socket updates of emergencies makes responding immediate. The white layout looks great.', rating: 5 }
            ].map((t, idx) => (
              <div key={idx} className="bg-white border border-slate-200/50 p-6 rounded-2xl text-left space-y-4">
                <div className="flex text-amber-400">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                <p className="text-slate-500 text-xs italic">"{t.text}"</p>
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="font-bold text-slate-800 text-xs">{t.name}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">{t.role}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 10. Frequently Asked Questions (FAQ) */}
      <section className="py-20 px-6 max-w-3xl mx-auto">
        <div className="text-center space-y-12">
          
          <h2 className="text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>

          <div className="space-y-4 text-left">
            {[
              { q: 'How do I request emergency help?', a: 'You can sign in and click "Report Emergency" to drop a pin. Alternatively, click the SOS button in the bottom-right corner to raise a guest alert without logging in.' },
              { q: 'Is registration required to request help?', a: 'No, registration is not required for emergency SOS triggers. However, registered accounts can track the volunteer’s progress live on map coordinates.' },
              { q: 'How are volunteers assigned?', a: 'Admins monitor the active emergencies. They verify the report coordinates and assign the nearest approved volunteer.' },
              { q: 'Can I reject assignments as a volunteer?', a: 'Yes, if you are unavailable, you can reject an assignment. The incident will immediately return to the pending queue for reassignment.' },
              { q: 'How do I become an approved volunteer?', a: 'Create an account and select the Volunteer role. Admins manually review registrations and activate accounts after verifying credentials.' }
            ].map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 flex items-center justify-between font-bold text-slate-800 text-xs bg-slate-50/50 hover:bg-slate-50 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={16} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="p-4 border-t border-slate-100 text-slate-500 text-xs leading-relaxed bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 11. Contact Section */}
      <section id="contact" className="py-20 bg-slate-50 border-t border-slate-100 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 text-left">
          
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Contact Response Command</h2>
            <p className="text-slate-500 text-xs">
              For administrative inquiries, partner NGOs, or support questions, please reach out to us.
            </p>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="flex items-center space-x-3">
                <Mail size={16} className="text-primary shrink-0" />
                <span>support@thesaviour.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone size={16} className="text-primary shrink-0" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin size={16} className="text-primary shrink-0" />
                <span>Adyar Sector Command, Chennai, India</span>
              </div>
            </div>

            {/* Mock Map grid */}
            <div className="h-44 bg-slate-200 border border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 text-xs relative overflow-hidden font-bold">
              <Map size={36} className="mb-2 mr-2 text-slate-300" />
              <span>Chennai Command Base Placeholder</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Send a Message</h3>
            
            {contactSubmitted ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle className="text-primary h-12 w-12 mx-auto" />
                <h4 className="font-bold text-slate-800">Message Received</h4>
                <p className="text-slate-500 text-xs">We will get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setContactSubmitted(true); }} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1 uppercase tracking-wider">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter name"
                    className="w-full bg-slate-950/5 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="w-full bg-slate-950/5 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1 uppercase tracking-wider">Message</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter your message..."
                    className="w-full bg-slate-950/5 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-light text-white font-bold py-2.5 rounded-lg shadow transition flex items-center justify-center space-x-1.5"
                >
                  <Send size={14} />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      {/* 12. Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12 px-6 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white">
              <LifeBuoy className="text-primary h-6 w-6 stroke-[2.5]" />
              <span className="font-extrabold text-lg tracking-tight">The Saviour</span>
            </div>
            <p className="leading-relaxed">Connecting communities to build disaster resilience and save lives through real-time coordination.</p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Quick Links</h4>
            <div className="flex flex-col space-y-2">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition text-left">Home</button>
              <button onClick={() => scrollToSection('about')} className="hover:text-white transition text-left">About Platform</button>
              <button onClick={() => scrollToSection('services')} className="hover:text-white transition text-left">Features</button>
              <button onClick={() => scrollToSection('impact')} className="hover:text-white transition text-left">Impact</button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Resources</h4>
            <div className="flex flex-col space-y-2">
              <Link to="/register" className="hover:text-white transition">Volunteer Signup</Link>
              <Link to="/login" className="hover:text-white transition">Platform Login</Link>
              <a href="#" className="hover:text-white transition">Privacy Policy</a>
              <a href="#" className="hover:text-white transition">Terms & Conditions</a>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-red-400 uppercase tracking-wider text-[10px] flex items-center">
              <AlertTriangle size={12} className="mr-1" /> Emergency Contact
            </h4>
            <div className="space-y-1">
              <p className="text-white font-bold font-mono">+91 98765 43210</p>
              <p>Adyar Sector Command Base</p>
              <p>Chennai, India</p>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto border-t border-slate-800/80 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-[10px] space-y-2 md:space-y-0 text-slate-500">
          <p>© {new Date().getFullYear()} The Saviour. All rights reserved.</p>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-slate-400 transition">GitHub</a>
            <a href="#" className="hover:text-slate-400 transition">Twitter</a>
            <a href="#" className="hover:text-slate-400 transition">LinkedIn</a>
          </div>
        </div>
      </footer>

      {/* 13. SOS Floating Action Button (Guest) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsSosOpen(true)}
          className="h-16 w-16 bg-red-600 hover:bg-red-500 text-white font-black rounded-full flex flex-col items-center justify-center shadow-2xl hover:scale-105 active:scale-95 border border-red-500 transition duration-300 animate-bounce relative group"
        >
          <AlertTriangle size={20} className="mb-0.5" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider">SOS</span>
          <span className="absolute -top-8 right-0 bg-red-950/80 border border-red-800 text-red-300 px-2 py-0.5 rounded text-[8px] opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
            Guest SOS Help
          </span>
        </button>
      </div>

      {/* Guest SOS Trigger Modal Popup */}
      {isSosOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden text-left my-8">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600"></div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-red-600 flex items-center space-x-1.5">
                  <AlertTriangle size={20} />
                  <span>EMERGENCY SOS FORM</span>
                </h3>
                <p className="text-slate-500 text-xs mt-1">Submit alert immediately without registration</p>
              </div>
              <button
                onClick={() => { setIsSosOpen(false); setSosSuccess(false); setSosError(''); }}
                className="p-1 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {sosSuccess ? (
              <div className="p-6 text-center space-y-4">
                <CheckCircle className="text-emerald-500 h-16 w-16 mx-auto" />
                <h4 className="text-xl font-bold text-slate-800">SOS Alert Submitted!</h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  First responders are actively coordinating dispatch for your location. Please remain calm.
                </p>
                <button
                  onClick={() => { setIsSosOpen(false); setSosSuccess(false); }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs transition"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleSosSubmit} className="space-y-3.5 text-xs">
                {sosError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg font-semibold text-[10px]">
                    {sosError}
                  </div>
                )}

                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={sosForm.name}
                    onChange={(e) => setSosForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950/5 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Emergency Contact Mobile</label>
                  <input
                    type="text"
                    required
                    placeholder="10-digit mobile number"
                    value={sosForm.mobile}
                    onChange={(e) => setSosForm(prev => ({ ...prev, mobile: e.target.value }))}
                    className="w-full bg-slate-950/5 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Category</label>
                    <select
                      value={sosForm.category}
                      onChange={(e) => setSosForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-slate-950/5 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-red-500"
                    >
                      <option value="medical">Medical Help</option>
                      <option value="fire">Fire Incident</option>
                      <option value="flood">Flood Danger</option>
                      <option value="earthquake">Earthquake</option>
                      <option value="accident">Road Accident</option>
                      <option value="other">Other Hazards</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Locate Me</label>
                    <button
                      type="button"
                      onClick={handleAcquireLocation}
                      className="w-full flex items-center justify-center space-x-1 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 font-bold transition"
                    >
                      <Compass size={14} className="text-red-500" />
                      <span>Acquire Coords</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Latitude</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 13.0827"
                      value={sosForm.latitude}
                      onChange={(e) => setSosForm(prev => ({ ...prev, latitude: e.target.value }))}
                      className="w-full bg-slate-950/5 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Longitude</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 80.2707"
                      value={sosForm.longitude}
                      onChange={(e) => setSosForm(prev => ({ ...prev, longitude: e.target.value }))}
                      className="w-full bg-slate-950/5 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Describe Danger</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Briefly state situation (e.g. water entering house)..."
                    value={sosForm.description}
                    onChange={(e) => setSosForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-950/5 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sosLoading}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold py-3 rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5"
                >
                  {sosLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Submit SOS Critical Alert</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Landing;
