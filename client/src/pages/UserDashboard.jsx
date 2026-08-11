import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { ShieldAlert, MapPin, Phone, RefreshCw, X, AlertTriangle, CheckCircle2, ChevronRight, Compass, Star } from 'lucide-react';

// Resolve Leaflet marker icon asset issue in Vite
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom volunteer marker (emerald color)
const volunteerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// Map click handler to place a pin
const MapClickHandler = ({ setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
};

// Helper component to center map when position changes
const MapCenterController = ({ center }) => {
  const map = useMapEvents({});
  useEffect(() => {
    if (center) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
};

const UserDashboard = () => {
  const { socket } = useSocket();
  
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [mapPin, setMapPin] = useState([13.0827, 80.2707]); // Default: Chennai coords
  const [volunteerLocation, setVolunteerLocation] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Rating states
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: 'medical',
      severity: 'medium',
      latitude: '',
      longitude: '',
      emergencyContact: ''
    }
  });

  const fetchRequests = async () => {
    try {
      const res = await api.get('/emergencies');
      if (res.data.status === 'success') {
        const list = res.data.data.requests;
        setRequests(list);
        
        // If there's a currently active selected request, update it
        if (selectedRequest) {
          const fresh = list.find(r => r._id === selectedRequest._id);
          if (fresh) {
            setSelectedRequest(fresh);
            if (fresh.assignedVolunteer && fresh.assignedVolunteer.location) {
              const coords = fresh.assignedVolunteer.location.coordinates;
              setVolunteerLocation([coords[1], coords[0]]); // [lat, lng]
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to retrieve emergency requests:', error.message);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for live status changes from volunteer or admin
    socket.on('notification', () => {
      fetchRequests();
    });

    // Listen for real-time location stream of the assigned volunteer
    socket.on('volunteer-location-updated', (data) => {
      if (selectedRequest && selectedRequest.assignedVolunteer && selectedRequest.assignedVolunteer._id === data.volunteerId) {
        setVolunteerLocation([data.coordinates[1], data.coordinates[0]]);
      }
    });

    return () => {
      socket.off('notification');
      socket.off('volunteer-location-updated');
    };
  }, [socket, selectedRequest]);

  // Sync manual map click with form coordinates
  useEffect(() => {
    setValue('latitude', mapPin[0].toFixed(6));
    setValue('longitude', mapPin[1].toFixed(6));
  }, [mapPin, setValue]);

  // Geolocation trigger
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapPin([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.error(err);
          alert('Could not acquire your current location. Please tap/click on the map.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // Create Request Submit
  const onSubmit = async (data) => {
    setErrorMsg('');
    setActionLoading(true);

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    formData.append('severity', data.severity);
    formData.append('latitude', data.latitude);
    formData.append('longitude', data.longitude);
    formData.append('emergencyContact', data.emergencyContact);

    if (data.image && data.image[0]) {
      formData.append('image', data.image[0]);
    }

    try {
      const res = await api.post('/emergencies', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.status === 'success') {
        reset();
        fetchRequests();
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to raise request. Please check inputs.');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Request
  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this emergency request?')) return;
    
    setActionLoading(true);
    try {
      const res = await api.post(`/emergencies/${id}/cancel`);
      if (res.data.status === 'success') {
        fetchRequests();
        if (selectedRequest && selectedRequest._id === id) {
          setSelectedRequest(res.data.data.request);
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  // Rate Volunteer
  const handleRateVolunteer = async (requestId, ratingValue) => {
    try {
      const res = await api.patch(`/emergencies/${requestId}/rate`, { rating: ratingValue });
      if (res.data.status === 'success') {
        setSelectedRating(0);
        setHoverRating(0);
        fetchRequests();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit rating');
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 text-red-600 border-red-200';
      case 'high': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'medium': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'low':
      default: return 'bg-green-50 text-primary border-green-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-emerald-600 bg-emerald-50 border border-emerald-250';
      case 'confirmed': return 'text-primary bg-green-55/90 border border-green-250 font-black';
      case 'cancelled': return 'text-slate-500 bg-slate-50 border border-slate-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border border-yellow-250';
      default: return 'text-primary bg-green-50 border border-green-250';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Raise request & History List */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Raise Request Form */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm relative overflow-hidden">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mb-4">
              <ShieldAlert className="text-red-500 h-5 w-5" />
              <span>Report Emergency</span>
            </h2>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Title / Hazard</label>
                <input
                  type="text"
                  placeholder="e.g. Flood blocking roads"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition"
                  {...register('title', { required: 'Title is required' })}
                />
                {errors.title && <p className="text-red-550 mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Provide brief details on situation..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition h-16 resize-none"
                  {...register('description', { required: 'Description is required' })}
                />
                {errors.description && <p className="text-red-550 mt-1">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Category</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition"
                    {...register('category')}
                  >
                    <option value="medical">Medical Help</option>
                    <option value="fire">Fire Incident</option>
                    <option value="flood">Flood Danger</option>
                    <option value="earthquake">Earthquake Help</option>
                    <option value="accident">Road Accident</option>
                    <option value="other">Other Hazards</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Severity</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition"
                    {...register('severity')}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Coordinates inputs */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Latitude</label>
                  <input
                    type="text"
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 cursor-not-allowed focus:outline-none"
                    {...register('latitude', { required: true })}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Longitude</label>
                  <input
                    type="text"
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 cursor-not-allowed focus:outline-none"
                    {...register('longitude', { required: true })}
                  />
                </div>
              </div>

              {/* Geo trigger button */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="w-full flex items-center justify-center space-x-1.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition font-bold"
              >
                <Compass size={14} className="text-primary" />
                <span>Locate Current Position</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="10-digit mobile"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition"
                    {...register('emergencyContact', {
                      required: 'Mobile is required',
                      pattern: { value: /^\d{10}$/, message: '10 digits' }
                    })}
                  />
                  {errors.emergencyContact && <p className="text-red-555 mt-1">{errors.emergencyContact.message}</p>}
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wider">Upload Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-500 focus:outline-none"
                    {...register('image')}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold py-2.5 rounded-xl shadow-md transition mt-2 flex items-center justify-center space-x-2 text-sm tracking-wide border border-red-500"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <span>Raise Emergency Request</span>
                )}
              </button>
            </form>
          </div>

          {/* Incident History List */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Incident Feed</h2>
              <button
                onClick={fetchRequests}
                className="p-1.5 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl transition"
              >
                <RefreshCw size={14} className="text-slate-500" />
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {requests.length === 0 ? (
                <p className="text-slate-400 text-center py-6 text-xs">No reports raised yet</p>
              ) : (
                requests.map((req) => (
                  <div
                    key={req._id}
                    onClick={() => {
                      setSelectedRequest(req);
                      const coords = req.location.coordinates;
                      setMapPin([coords[1], coords[0]]);
                      if (req.assignedVolunteer && req.assignedVolunteer.location) {
                        const volCoords = req.assignedVolunteer.location.coordinates;
                        setVolunteerLocation([volCoords[1], volCoords[0]]);
                      } else {
                        setVolunteerLocation(null);
                      }
                    }}
                    className={`p-3 border rounded-2xl cursor-pointer transition text-xs flex justify-between items-center ${
                      selectedRequest?._id === req._id
                        ? 'bg-green-50/50 border-primary/40'
                        : 'bg-slate-50/40 border-slate-200/80 hover:bg-slate-100/30'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold border ${getSeverityStyle(req.severity)}`}>
                          {req.severity}
                        </span>
                        <h3 className="font-bold text-slate-850 truncate">{req.title}</h3>
                      </div>
                      <p className="text-slate-500 capitalize truncate">{req.category} • {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1 shrink-0 ml-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(req.status)}`}>
                        {req.status.replace('_', ' ')}
                      </span>
                      <ChevronRight size={14} className="text-slate-450" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Map & Live Tracking (2 cols) */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          
          {/* Active Incident Tracker */}
          {selectedRequest ? (
            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex-1 flex flex-col">
              
              {/* Tracker Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-xs uppercase font-extrabold border ${getSeverityStyle(selectedRequest.severity)}`}>
                      {selectedRequest.severity}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">{selectedRequest.title}</h2>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">
                    Reported on: {new Date(selectedRequest.createdAt).toLocaleString()}
                  </p>
                </div>
                
                {/* Cancel action */}
                {!['completed', 'confirmed', 'cancelled', 'rejected'].includes(selectedRequest.status) && (
                  <button
                    onClick={() => handleCancelRequest(selectedRequest._id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-650 text-xs font-bold rounded-xl transition"
                  >
                    <X size={14} />
                    <span>Cancel Request</span>
                  </button>
                )}
              </div>

              {/* Status Tracker Progress Bar */}
              <div className="grid grid-cols-5 gap-1 mb-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {[
                  { step: 'pending', label: 'Alerted' },
                  { step: 'assigned', label: 'Dispatched' },
                  { step: 'accepted', label: 'Accepted' },
                  { step: 'reached', label: 'Arrived' },
                  { step: 'completed', label: 'Resolved' }
                ].map((item) => {
                  const statusOrder = ['pending', 'assigned', 'accepted', 'reached', 'in_progress', 'completed', 'confirmed'];
                  const currentIdx = statusOrder.indexOf(selectedRequest.status);
                  const stepIdx = statusOrder.indexOf(item.step);
                  const isCompleted = currentIdx >= stepIdx && selectedRequest.status !== 'cancelled';
                  const isCurrent = selectedRequest.status === item.step;

                  return (
                    <div key={item.step} className="flex flex-col items-center">
                      <div className={`h-2 w-full rounded mb-2 ${
                        isCompleted ? 'bg-primary' : isCurrent ? 'bg-primary-light animate-pulse' : 'bg-slate-200'
                      }`}></div>
                      <span className={isCompleted ? 'text-primary-dark font-extrabold' : isCurrent ? 'text-primary font-extrabold' : 'text-slate-400'}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Content Panel: Details & Live Map */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Details side */}
                <div className="md:col-span-1 space-y-4 text-xs">
                  <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-2xl space-y-3">
                    <h3 className="font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">Description</h3>
                    <p className="text-slate-600 leading-normal">{selectedRequest.description}</p>
                  </div>

                  <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-2xl space-y-3">
                    <h3 className="font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">Emergency Contact</h3>
                    <div className="flex items-center space-x-2 text-slate-650 font-medium">
                      <Phone size={14} className="text-slate-400" />
                      <span>{selectedRequest.emergencyContact}</span>
                    </div>
                  </div>

                  {selectedRequest.assignedVolunteer ? (
                    <div className="bg-green-50/30 p-4 border border-green-200 rounded-2xl space-y-3">
                      <h3 className="font-extrabold text-primary-dark uppercase tracking-wider border-b border-green-150 pb-1.5 flex items-center space-x-1.5">
                        <span className="h-2 w-2 rounded-full bg-primary animate-ping"></span>
                        <span>Assigned Responder</span>
                      </h3>
                      <div>
                        <p className="text-slate-800 font-bold text-sm">{selectedRequest.assignedVolunteer.name}</p>
                        <p className="text-slate-500 mt-0.5">{selectedRequest.assignedVolunteer.mobile}</p>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[10px] uppercase font-bold tracking-wider pt-1">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                          selectedRequest.assignedVolunteer.isOnline ? 'bg-primary' : 'bg-slate-400'
                        }`}></span>
                        <span className={selectedRequest.assignedVolunteer.isOnline ? 'text-primary-dark' : 'text-slate-400'}>
                          {selectedRequest.assignedVolunteer.isOnline ? 'Online - Live stream active' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50/50 p-4 border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center text-center text-slate-500 py-8">
                      <AlertTriangle size={24} className="mb-2 text-yellow-500/80" />
                      <p className="font-bold text-slate-800">Waiting for Dispatch</p>
                      <p className="text-[10px] mt-1 max-w-[160px] text-slate-400 leading-normal">Platform dispatchers are assigning responders immediately.</p>
                    </div>
                  )}

                  {['completed', 'confirmed'].includes(selectedRequest.status) && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-2xl space-y-2">
                      <h4 className="font-bold text-primary-dark flex items-center space-x-1">
                        <CheckCircle2 size={14} className="text-primary" />
                        <span>Resolution Summary</span>
                      </h4>
                      <p className="text-slate-650 leading-relaxed">
                        {selectedRequest.resolutionReport || 'Rescue operation completed successfully.'}
                      </p>
                      {selectedRequest.resolutionImage && (
                        <div className="mt-2.5 rounded-xl overflow-hidden max-h-48 border border-green-200 shadow-sm">
                          <img 
                            src={selectedRequest.resolutionImage} 
                            alt="Rescue Confirmation" 
                            className="w-full object-cover max-h-48" 
                          />
                        </div>
                      )}

                      {/* Rating Component */}
                      {selectedRequest.rating ? (
                        <div className="pt-2.5 border-t border-green-200 mt-2.5 flex items-center space-x-2">
                          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Your Rating:</span>
                          <div className="flex text-amber-500">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                size={14} 
                                className={star <= selectedRequest.rating ? 'fill-current' : 'text-slate-300'} 
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2.5 border-t border-green-250 mt-2.5 space-y-2">
                          <label className="block text-slate-550 font-bold uppercase tracking-wider text-[10px]">Rate Volunteer's Rescue Work</label>
                          <div className="flex items-center justify-between">
                            <div className="flex space-x-1.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={18}
                                  className={`cursor-pointer transition-colors ${
                                    star <= (hoverRating || selectedRating) 
                                      ? 'text-amber-500 fill-current' 
                                      : 'text-slate-300 hover:text-amber-400'
                                  }`}
                                  onClick={() => setSelectedRating(star)}
                                  onMouseEnter={() => setHoverRating(star)}
                                  onMouseLeave={() => setHoverRating(0)}
                                />
                              ))}
                            </div>
                            <button
                              onClick={() => handleRateVolunteer(selectedRequest._id, selectedRating)}
                              disabled={selectedRating === 0}
                              className="px-3 py-1.5 bg-primary hover:bg-primary-light disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-[10px] uppercase rounded-xl transition shadow-sm"
                            >
                              Submit Rating
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tracking Map side */}
                <div className="md:col-span-2 h-72 md:h-auto min-h-[300px] border border-slate-200 rounded-2xl relative overflow-hidden shadow-inner">
                  <MapContainer
                    center={[selectedRequest.location.coordinates[1], selectedRequest.location.coordinates[0]]}
                    zoom={14}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    <Marker position={[selectedRequest.location.coordinates[1], selectedRequest.location.coordinates[0]]}>
                      <Popup>
                        <div className="text-slate-950 text-xs">
                          <p className="font-bold">Incident Point</p>
                          <p className="text-[10px]">{selectedRequest.title}</p>
                        </div>
                      </Popup>
                    </Marker>

                    {volunteerLocation && (
                      <Marker position={volunteerLocation} icon={volunteerIcon}>
                        <Popup>
                          <div className="text-slate-950 text-xs">
                            <p className="font-bold">Responder: {selectedRequest.assignedVolunteer.name}</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    <MapCenterController center={[selectedRequest.location.coordinates[1], selectedRequest.location.coordinates[0]]} />
                  </MapContainer>
                </div>

              </div>

            </div>
          ) : (
            // Default select request instructions map
            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-800 mb-2 flex items-center space-x-1.5 uppercase tracking-wider">
                  <MapPin className="text-primary h-4.5 w-4.5" />
                  <span>Incident Marker Pin Drop</span>
                </h2>
                <p className="text-slate-550 text-xs leading-normal">
                  Tap anywhere on the map grid below to specify the hazard coordinates. The selected latitude/longitude values will automatically bind to the emergency report form on the left.
                </p>
              </div>

              {/* Selection Map container */}
              <div className="h-[400px] border border-slate-200 rounded-2xl overflow-hidden mt-4 relative shadow-inner">
                <MapContainer
                  center={mapPin}
                  zoom={12}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={mapPin}>
                    <Popup>
                      <div className="text-slate-950 text-xs">
                        Selected Incident Coordinates
                      </div>
                    </Popup>
                  </Marker>
                  <MapClickHandler setPosition={setMapPin} />
                  <MapCenterController center={mapPin} />
                </MapContainer>
              </div>
            </div>
          )}

        </div>

      </main>
    </div>
  );
};

export default UserDashboard;
