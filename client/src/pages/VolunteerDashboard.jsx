import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { LifeBuoy, Check, Compass, ShieldAlert, Phone, RefreshCw, Clipboard, CheckCircle2, ChevronRight, XOctagon } from 'lucide-react';

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const volunteerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [volunteerCoords, setVolunteerCoords] = useState(null);
  const [resolutionReport, setResolutionReport] = useState('');
  const [resolutionImage, setResolutionImage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch volunteer assignments
  const fetchMissions = async () => {
    try {
      const res = await api.get('/emergencies');
      if (res.data.status === 'success') {
        const list = res.data.data.requests;
        setMissions(list);

        // Auto-select the active mission (not completed/cancelled)
        const active = list.find(m => !['completed', 'cancelled'].includes(m.status));
        if (active) {
          setSelectedMission(active);
        } else if (list.length > 0 && !selectedMission) {
          setSelectedMission(list[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch volunteer missions:', error.message);
    }
  };

  useEffect(() => {
    if (user && user.isApproved) {
      fetchMissions();
    }
  }, [user]);

  // Geolocation Streaming to Server
  useEffect(() => {
    if (!socket || !isOnline || !user || !user.isApproved) return;

    const streamLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setVolunteerCoords([latitude, longitude]);
            socket.emit('update-location', { latitude, longitude });
          },
          (err) => {
            console.error('Geolocation error in stream:', err.message);
          },
          { enableHighAccuracy: true }
        );
      }
    };

    streamLocation();
    const interval = setInterval(streamLocation, 10000); // Stream coordinates every 10 seconds

    return () => clearInterval(interval);
  }, [socket, isOnline, user]);

  useEffect(() => {
    if (!socket) return;
    
    // Refresh assignments list on global notifications
    socket.on('notification', () => {
      fetchMissions();
    });

    return () => {
      socket.off('notification');
    };
  }, [socket]);

  // Update assignment status handler
  const handleUpdateStatus = async (status, extraData = {}) => {
    setActionLoading(true);
    try {
      let payload;
      let headers = {};

      if (extraData.resolutionImage) {
        payload = new FormData();
        payload.append('status', status);
        if (extraData.resolutionReport) {
          payload.append('resolutionReport', extraData.resolutionReport);
        }
        payload.append('resolutionImage', extraData.resolutionImage);
        headers = { 'Content-Type': 'multipart/form-data' };
      } else {
        payload = {
          status,
          ...extraData
        };
      }

      const res = await api.patch(`/emergencies/${selectedMission._id}/status`, payload, { headers });

      if (res.data.status === 'success') {
        const updated = res.data.data.request;
        setResolutionReport('');
        setResolutionImage(null);
        fetchMissions();
        
        if (status === 'rejected') {
          setSelectedMission(null);
        } else {
          setSelectedMission(updated);
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Guard: If registration is not approved yet
  if (user && !user.isApproved) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl shadow-xl text-center space-y-6">
            <div className="inline-flex p-4 bg-yellow-500/10 rounded-full text-yellow-600 animate-pulse">
              <ShieldAlert size={48} className="stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Verification Pending</h1>
            <p className="text-slate-500 text-xs leading-relaxed">
              Your registration as a first-responder volunteer is currently pending review by emergency administrators of **The Saviour**.
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-2.5 text-left">
              <p><span className="font-bold text-slate-550">Name:</span> {user.name}</p>
              <p><span className="font-bold text-slate-550">Email:</span> {user.email}</p>
              <p><span className="font-bold text-slate-550">Status:</span> Verification In Progress</p>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Please coordinate with your administrative NGO lead.
            </div>
          </div>
        </main>
      </div>
    );
  }

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 text-red-650 border-red-200';
      case 'high': return 'bg-orange-50 text-orange-650 border-orange-200';
      case 'medium': return 'bg-yellow-50 text-yellow-650 border-yellow-200';
      case 'low':
      default: return 'bg-green-50 text-primary border-green-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'assigned': return 'Assigned (Awaiting Response)';
      case 'accepted': return 'Mission Accepted';
      case 'reached': return 'Arrived at Destination';
      case 'in_progress': return 'Rescue Operations Active';
      case 'completed': return 'Resolved';
      default: return status.toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Availability & Assignments list */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Availability Toggle */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Duty Availability</h2>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                {isOnline ? 'Online - Geolocation stream active' : 'Offline'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isOnline} 
                onChange={(e) => setIsOnline(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/45 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white"></div>
            </label>
          </div>

          {/* Assignment Roster list */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-slate-850 uppercase tracking-wider">My Mission Roster</h2>
              <button
                onClick={fetchMissions}
                className="p-1.5 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl transition"
              >
                <RefreshCw size={14} className="text-slate-500" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 font-sans">
              {missions.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-xs">No assignments registered yet.</p>
              ) : (
                missions.map((mission) => {
                  const isActive = !['completed', 'cancelled'].includes(mission.status);
                  return (
                    <div
                      key={mission._id}
                      onClick={() => setSelectedMission(mission)}
                      className={`p-3 border rounded-2xl cursor-pointer transition text-xs flex justify-between items-center ${
                        selectedMission?._id === mission._id
                          ? 'bg-green-50/50 border-primary/40'
                          : 'bg-slate-50/40 border-slate-200/80 hover:bg-slate-100/30'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold border ${getSeverityBadge(mission.severity)}`}>
                            {mission.severity}
                          </span>
                          <h3 className="font-bold text-slate-800 truncate">{mission.title}</h3>
                        </div>
                        <p className="text-slate-500 capitalize truncate">{mission.category} • {new Date(mission.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-1 shrink-0 ml-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                          isActive ? 'text-primary bg-green-100 border-green-200 animate-pulse' : 'text-slate-400 bg-slate-100 border-slate-200'
                        }`}>
                          {isActive ? 'Active' : 'Done'}
                        </span>
                        <ChevronRight size={14} className="text-slate-450" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Active Mission controls & Map (2 cols) */}
        <div className="lg:col-span-2 flex flex-col space-y-6 font-sans">
          
          {selectedMission ? (
            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex-1 flex flex-col">
              
              {/* Mission Header */}
              <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col md:flex-row justify-between md:items-center space-y-2 md:space-y-0">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-xs uppercase font-extrabold border ${getSeverityBadge(selectedMission.severity)}`}>
                      {selectedMission.severity}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">{selectedMission.title}</h2>
                  </div>
                  <p className="text-slate-550 text-xs mt-1">
                    Status: <span className="text-slate-800 font-bold">{getStatusLabel(selectedMission.status)}</span>
                  </p>
                </div>

                {/* Tracking trigger info */}
                {isOnline && volunteerCoords && (
                  <div className="flex items-center space-x-1.5 text-primary-dark text-xs font-bold bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl shrink-0">
                    <Compass size={14} className="text-primary animate-spin-slow" />
                    <span>Location Sharing Active</span>
                  </div>
                )}
              </div>

              {/* Grid content: Mission controls & Map */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Details and active workflows */}
                <div className="md:col-span-1 space-y-4 text-xs">
                  
                  {/* User details */}
                  <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-2xl space-y-3">
                    <h3 className="font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">User Contact</h3>
                    <div>
                      <p className="text-slate-800 font-bold text-sm">{selectedMission.createdBy?.name || 'Anonymous Guest'}</p>
                      <div className="flex items-center space-x-1.5 text-slate-500 mt-1 font-medium">
                        <Phone size={12} className="text-slate-400" />
                        <span className="font-mono">{selectedMission.emergencyContact}</span>
                      </div>
                    </div>
                  </div>

                  {/* Incident details */}
                  <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-2xl space-y-2">
                    <h3 className="font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">Situation Details</h3>
                    <p className="text-slate-600 leading-relaxed">{selectedMission.description}</p>
                  </div>

                  {/* Mission progress controllers */}
                  <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-2xl space-y-3">
                    <h3 className="font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">Rescue Workflow</h3>
                    
                    {actionLoading && (
                      <div className="flex justify-center py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    )}

                    {!actionLoading && selectedMission.status === 'assigned' && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => handleUpdateStatus('accepted')}
                          className="flex items-center justify-center space-x-1.5 py-2.5 bg-primary hover:bg-primary-light text-white font-bold rounded-xl transition shadow-sm hover:shadow active:scale-98"
                        >
                          <Check size={14} />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus('rejected')}
                          className="flex items-center justify-center space-x-1.5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold rounded-xl transition active:scale-98"
                        >
                          <XOctagon size={14} />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}

                    {!actionLoading && selectedMission.status === 'accepted' && (
                      <button
                        onClick={() => handleUpdateStatus('reached')}
                        className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-primary hover:bg-primary-light text-white font-bold rounded-xl transition shadow-sm hover:shadow active:scale-98"
                      >
                        <Compass size={14} />
                        <span>Arrived at Location</span>
                      </button>
                    )}

                    {!actionLoading && selectedMission.status === 'reached' && (
                      <button
                        onClick={() => handleUpdateStatus('in_progress')}
                        className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-primary-dark hover:bg-primary text-white font-bold rounded-xl transition shadow-sm hover:shadow active:scale-98"
                      >
                        <LifeBuoy size={14} />
                        <span>Start Rescue Operations</span>
                      </button>
                    )}

                    {!actionLoading && selectedMission.status === 'in_progress' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Resolution Report</label>
                          <textarea
                            placeholder="State actions taken to resolve incident..."
                            value={resolutionReport}
                            onChange={(e) => setResolutionReport(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 h-16 resize-none focus:outline-none focus:border-primary text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Upload Confirmation Image (Proof)</label>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => setResolutionImage(e.target.files[0])}
                            className="w-full text-slate-500 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition"
                          />
                        </div>
                        <button
                          onClick={() => handleUpdateStatus('completed', { resolutionReport, resolutionImage })}
                          disabled={!resolutionReport.trim()}
                          className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-primary hover:bg-primary-light disabled:bg-slate-200 disabled:text-slate-400 font-extrabold rounded-xl transition shadow-sm"
                        >
                          <CheckCircle2 size={14} />
                          <span>Complete Mission</span>
                        </button>
                      </div>
                    )}

                    {['completed', 'cancelled'].includes(selectedMission.status) && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 font-semibold uppercase tracking-wide">
                        Resolved
                      </div>
                    )}
                  </div>

                  {selectedMission.resolutionReport && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-2xl space-y-2">
                      <h4 className="font-bold text-primary-dark flex items-center space-x-1">
                        <CheckCircle2 size={14} className="text-primary" />
                        <span>Completion Summary</span>
                      </h4>
                      <p className="text-slate-650 leading-normal">{selectedMission.resolutionReport}</p>
                      {selectedMission.resolutionImage && (
                        <div className="mt-2.5 rounded-xl overflow-hidden max-h-48 border border-green-200 shadow-sm">
                          <img 
                            src={selectedMission.resolutionImage} 
                            alt="Rescue Confirmation" 
                            className="w-full object-cover max-h-48" 
                          />
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Leaflet Navigation Map */}
                <div className="md:col-span-2 h-72 md:h-auto min-h-[300px] border border-slate-200 rounded-2xl relative overflow-hidden shadow-inner">
                  <MapContainer
                    center={[selectedMission.location.coordinates[1], selectedMission.location.coordinates[0]]}
                    zoom={13}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Victim Marker */}
                    <Marker 
                      position={[selectedMission.location.coordinates[1], selectedMission.location.coordinates[0]]}
                      icon={userIcon}
                    >
                      <Popup>
                        <div className="text-slate-950 text-xs">
                          <p className="font-bold">Incident Point: {selectedMission.createdBy.name}</p>
                          <p className="text-[10px]">{selectedMission.title}</p>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Volunteer Marker */}
                    {volunteerCoords && (
                      <Marker position={volunteerCoords} icon={volunteerIcon}>
                        <Popup>
                          <div className="text-slate-950 text-xs">
                            <p className="font-bold">My Location</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Simple straight navigation line */}
                    {volunteerCoords && (
                      <Polyline 
                        positions={[volunteerCoords, [selectedMission.location.coordinates[1], selectedMission.location.coordinates[0]]]} 
                        color="#16a34a" 
                        dashArray="5, 10"
                      />
                    )}
                  </MapContainer>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex-1 flex flex-col items-center justify-center text-center space-y-3 py-16">
              <Clipboard className="text-slate-350" size={48} />
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">No Active Missions</h2>
              <p className="text-slate-500 text-xs max-w-sm leading-normal">
                You are currently idle. Toggle your Duty Availability to notify administrative coordinators that you are ready for assignments.
              </p>
            </div>
          )}

        </div>

      </main>
    </div>
  );
};

export default VolunteerDashboard;
