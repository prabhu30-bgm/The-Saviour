import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Users, LifeBuoy, ShieldAlert, BarChart3, Map, RefreshCw, Check, X, ShieldAlert as AlertIcon, UserMinus, UserCheck, Trash2, Star } from 'lucide-react';

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

const AdminDashboard = () => {
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState('live_map'); // 'live_map', 'volunteers', 'incidents', 'analytics'
  const [analytics, setAnalytics] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [volunteerLocations, setVolunteerLocations] = useState({}); // { volunteerId: [lat, lng] }
  const [highlightedIncidentId, setHighlightedIncidentId] = useState(null);
  const [selectedIncidentForReview, setSelectedIncidentForReview] = useState(null);

  useEffect(() => {
    const handleNotificationClick = (e) => {
      const notif = e.detail;
      if (notif && notif.referenceId) {
        const incidentId = typeof notif.referenceId === 'object' ? notif.referenceId._id : notif.referenceId;
        
        // Go to incidents tab
        setActiveTab('incidents');
        setHighlightedIncidentId(incidentId);

        // Scroll the element into view once the tab is rendered
        setTimeout(() => {
          const rowElement = document.getElementById(`incident-row-${incidentId}`);
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);

        // Remove the highlight pulse animation after 4 seconds
        setTimeout(() => {
          setHighlightedIncidentId(null);
        }, 4000);
      }
    };

    window.addEventListener('notification-click', handleNotificationClick);
    return () => {
      window.removeEventListener('notification-click', handleNotificationClick);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Analytics
      const analRes = await api.get('/admin/analytics');
      if (analRes.data.status === 'success') {
        setAnalytics(analRes.data.data);
      }

      // 2. Fetch Users (Filter: Volunteers)
      const volRes = await api.get('/admin/users?role=volunteer');
      if (volRes.data.status === 'success') {
        const volList = volRes.data.data.users;
        setVolunteers(volList);

        // Map live locations from user records
        const locations = {};
        volList.forEach(vol => {
          if (vol.location && vol.location.coordinates) {
            const coords = vol.location.coordinates;
            // Only map if not default [0,0]
            if (coords[0] !== 0 || coords[1] !== 0) {
              locations[vol._id] = [coords[1], coords[0]];
            }
          }
        });
        setVolunteerLocations(locations);
      }

      // 3. Fetch Incidents
      const incRes = await api.get('/emergencies');
      if (incRes.data.status === 'success') {
        setIncidents(incRes.data.data.requests);
      }
    } catch (error) {
      console.error('Failed to load admin dashboard data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for live volunteer location streams
    socket.on('volunteer-location-updated', (data) => {
      setVolunteerLocations(prev => ({
        ...prev,
        [data.volunteerId]: [data.coordinates[1], data.coordinates[0]] // [lat, lng]
      }));
    });

    // Refresh dashboard feeds on status updates
    socket.on('notification', () => {
      fetchData();
    });

    return () => {
      socket.off('volunteer-location-updated');
      socket.off('notification');
    };
  }, [socket]);

  // Approve / Suspend Volunteer status update
  const handleUpdateVolunteer = async (id, action) => {
    try {
      const res = await api.patch(`/admin/users/${id}/status`, { action });
      if (res.data.status === 'success') {
        fetchData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update volunteer status');
    }
  };

  // Delete User (Volunteer)
  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete/remove volunteer ${name}? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await api.delete(`/admin/users/${id}`);
      if (res.data.status === 'success') {
        fetchData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete volunteer');
    }
  };

  // Assign Volunteer to incident
  const handleAssignVolunteer = async (incidentId, volunteerId) => {
    try {
      const res = await api.patch(`/emergencies/${incidentId}/assign`, { volunteerId });
      if (res.data.status === 'success') {
        fetchData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to assign volunteer');
    }
  };

  // Reject Incident request (Admin only)
  const handleRejectIncident = async (id, title) => {
    if (!window.confirm(`Are you sure you want to reject the emergency request "${title}"?`)) {
      return;
    }
    try {
      const res = await api.patch(`/emergencies/${id}/reject`);
      if (res.data.status === 'success') {
        fetchData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject emergency request');
    }
  };

  // Confirm Incident resolution (Admin only)
  const handleConfirmResolution = async (id) => {
    try {
      const res = await api.patch(`/emergencies/${id}/confirm`);
      if (res.data.status === 'success') {
        setSelectedIncidentForReview(null);
        fetchData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to confirm emergency resolution');
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 text-red-650 border border-red-150';
      case 'high': return 'bg-orange-50 text-orange-650 border border-orange-150';
      case 'medium': return 'bg-yellow-50 text-yellow-650 border border-yellow-150';
      case 'low':
      default: return 'bg-green-50 text-primary border border-green-150';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return 'text-emerald-600 bg-emerald-50 border border-emerald-250';
      case 'confirmed': return 'text-primary bg-green-55/90 border border-green-250 font-black';
      case 'cancelled': return 'text-slate-500 bg-slate-50 border border-slate-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border border-yellow-250';
      default: return 'text-primary bg-green-50 border border-green-250';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Navbar />

      {/* Admin Tab Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex space-x-2 text-xs font-semibold">
            {[
              { id: 'live_map', label: 'Live Operations Map', icon: Map },
              { id: 'incidents', label: 'Incidents Queue', icon: ShieldAlert },
              { id: 'volunteers', label: 'Volunteer Roster', icon: LifeBuoy },
              { id: 'analytics', label: 'System Analytics', icon: BarChart3 }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition ${
                    activeTab === tab.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-850 hover:bg-slate-100/50'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl transition"
          >
            <RefreshCw size={16} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        
        {/* Analytics Top Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Users Registered</p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{analytics.stats.totalUsers}</h3>
              </div>
              <div className="p-3 bg-green-55/10 border border-green-200/20 text-primary rounded-2xl">
                <Users size={22} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Volunteers</p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{analytics.stats.totalVolunteers}</h3>
              </div>
              <div className="p-3 bg-green-55/10 border border-green-200/20 text-primary rounded-2xl">
                <LifeBuoy size={22} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Disaster Alerts</p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{analytics.stats.totalRequests}</h3>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 text-red-500 rounded-2xl">
                <ShieldAlert size={22} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Rescues</p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-1">
                  {incidents.filter(i => ['accepted', 'reached', 'in_progress'].includes(i.status)).length}
                </h3>
              </div>
              <div className="p-3 bg-green-55/10 border border-green-200/20 text-primary rounded-2xl">
                <RefreshCw size={22} className="animate-spin-slow text-primary" />
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 1: Live Operations Map */}
        {activeTab === 'live_map' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col h-[550px] overflow-hidden">
            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Active Disaster Mapping Grid</h2>
              <div className="flex space-x-4 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <span className="flex items-center"><span className="h-2 w-2 rounded-full bg-red-500 mr-1.5"></span> Incident</span>
                <span className="flex items-center"><span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5"></span> Responder</span>
              </div>
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden relative border border-slate-100 shadow-inner">
              <MapContainer
                center={[13.0827, 80.2707]} // Chennai default
                zoom={12}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Render Incidents */}
                {incidents.map(inc => {
                  const coords = inc.location.coordinates;
                  return (
                    <Marker key={inc._id} position={[coords[1], coords[0]]} icon={userIcon}>
                      <Popup>
                        <div className="text-slate-950 text-xs">
                          <p className="font-bold border-b pb-1 mb-1">{inc.title}</p>
                          <p><strong>Category:</strong> <span className="capitalize">{inc.category}</span></p>
                          <p><strong>Severity:</strong> <span className="capitalize">{inc.severity}</span></p>
                          <p><strong>Status:</strong> <span className="capitalize">{inc.status.replace('_', ' ')}</span></p>
                          {inc.assignedVolunteer && <p className="text-emerald-600 font-semibold"><strong>Assigned:</strong> {inc.assignedVolunteer.name}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Render Volunteers */}
                {volunteers.map(vol => {
                  const loc = volunteerLocations[vol._id];
                  if (!loc) return null;
                  return (
                    <Marker key={vol._id} position={loc} icon={volunteerIcon}>
                      <Popup>
                        <div className="text-slate-950 text-xs">
                          <p className="font-bold border-b pb-1 mb-1">{vol.name}</p>
                          <p><strong>Status:</strong> {vol.isOnline ? 'Online - Active Duty' : 'Offline'}</p>
                          <p><strong>Mobile:</strong> {vol.mobile}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Render navigation lines for active rescues */}
                {incidents.map(inc => {
                  const incidentCoords = inc.location.coordinates;
                  if (inc.assignedVolunteer && volunteerLocations[inc.assignedVolunteer._id]) {
                    const volLoc = volunteerLocations[inc.assignedVolunteer._id];
                    return (
                      <Polyline 
                        key={`route-${inc._id}`} 
                        positions={[volLoc, [incidentCoords[1], incidentCoords[0]]]} 
                        color="#16a34a" 
                        dashArray="5, 10" 
                      />
                    );
                  }
                  return null;
                })}
              </MapContainer>
            </div>
          </div>
        )}

        {/* Tab Content 2: Incidents Queue */}
        {activeTab === 'incidents' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Emergency Dispatch Queue</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50">
                    <th className="p-3">Title / Severity</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Incident Coords</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Assign Responder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">No emergency requests registered yet</td>
                    </tr>
                  ) : (
                    incidents.map(inc => (
                      <tr 
                        key={inc._id} 
                        id={`incident-row-${inc._id}`}
                        className={`hover:bg-slate-50/50 transition-all duration-500 ${
                          highlightedIncidentId === inc._id 
                            ? 'bg-amber-50 border-y-2 border-amber-300 ring-2 ring-amber-400 ring-opacity-30' 
                            : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{inc.title}</div>
                          <div className="flex space-x-1.5 mt-1">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${getSeverityBadge(inc.severity)}`}>
                              {inc.severity}
                            </span>
                            <span className="text-slate-550 capitalize">{inc.category}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-700">{inc.createdBy?.name || 'Anonymous Guest'}</div>
                          <div className="text-slate-500 mt-0.5">{inc.emergencyContact}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {inc.location.coordinates[1].toFixed(4)}, {inc.location.coordinates[0].toFixed(4)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded text-[9px] font-bold border uppercase ${getStatusBadge(inc.status)}`}>
                            {inc.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3">
                          {inc.status === 'completed' ? (
                            <button
                              onClick={() => setSelectedIncidentForReview(inc)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-250 text-amber-700 font-extrabold text-[10px] rounded-xl uppercase transition shadow-sm"
                            >
                              Review Proof
                            </button>
                          ) : ['confirmed', 'cancelled', 'rejected'].includes(inc.status) ? (
                            <div className="text-slate-400 text-xs italic font-semibold capitalize">{inc.status.replace('_', ' ')}</div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <select
                                value={inc.assignedVolunteer?._id || ''}
                                onChange={(e) => handleAssignVolunteer(inc._id, e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-primary focus:bg-white"
                              >
                                <option value="">-- Select Volunteer --</option>
                                {volunteers
                                  .filter(v => v.isApproved && v.status === 'active')
                                  .map(v => (
                                    <option key={v._id} value={v._id}>
                                      {v.name} ({v.isOnline ? 'Online' : 'Offline'})
                                    </option>
                                  ))}
                              </select>
                              {inc.assignedVolunteer && (
                                <button
                                  onClick={() => handleAssignVolunteer(inc._id, '')}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 rounded-xl transition"
                                  title="Unassign volunteer"
                                >
                                  <UserMinus size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleRejectIncident(inc._id, inc.title)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 rounded-xl transition"
                                title="Reject Incident Request"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content 3: Volunteer Roster */}
        {activeTab === 'volunteers' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">First Responder Approvals & Controls</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50">
                    <th className="p-3">Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Mobile Contact</th>
                    <th className="p-3">Onboard status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {volunteers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">No volunteers registered yet</td>
                    </tr>
                  ) : (
                    volunteers.map(vol => (
                      <tr key={vol._id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                            <span>{vol.name}</span>
                            {vol.averageRating && (
                              <span className="flex items-center text-amber-500 font-extrabold text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                <Star size={10} className="fill-current mr-0.5" />
                                <span>{vol.averageRating}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5 mt-1 text-[10px] font-bold uppercase">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${vol.isOnline ? 'bg-primary' : 'bg-slate-405'}`}></span>
                            <span className={vol.isOnline ? 'text-primary-dark font-extrabold' : 'text-slate-400'}>
                              {vol.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">{vol.email}</td>
                        <td className="p-3 font-mono text-slate-500">{vol.mobile}</td>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                              vol.isApproved ? 'bg-green-50 text-primary-dark border-green-200' : 'bg-yellow-50 text-yellow-600 border-yellow-200 animate-pulse'
                            }`}>
                              {vol.isApproved ? 'Approved' : 'Pending Verification'}
                            </span>
                            {vol.status === 'suspended' && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-600 border border-red-200">
                                Suspended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            {!vol.isApproved ? (
                              <>
                                <button
                                  onClick={() => handleUpdateVolunteer(vol._id, 'approve')}
                                  className="flex items-center space-x-1 px-3 py-1.5 bg-primary hover:bg-primary-light text-white font-bold rounded-xl transition text-[10px] uppercase shadow-sm"
                                >
                                  <UserCheck size={12} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateVolunteer(vol._id, 'reject')}
                                  className="flex items-center space-x-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold rounded-xl transition text-[10px] uppercase"
                                >
                                  <X size={12} />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : (
                              <>
                                {vol.status === 'active' ? (
                                  <button
                                    onClick={() => handleUpdateVolunteer(vol._id, 'suspend')}
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 font-bold rounded-xl transition text-[10px] uppercase"
                                  >
                                    <AlertIcon size={12} />
                                    <span>Suspend</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUpdateVolunteer(vol._id, 'activate')}
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-green-50 border border-green-200 text-primary-dark font-bold rounded-xl transition text-[10px] uppercase"
                                  >
                                    <Check size={12} />
                                    <span>Reactivate</span>
                                  </button>
                                )}
                              </>
                            )}

                            <button
                              onClick={() => handleDeleteUser(vol._id, vol.name)}
                              className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition text-[10px] uppercase shadow-sm"
                              title="Delete Volunteer"
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content 4: System Analytics & Audit logs */}
        {activeTab === 'analytics' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Audit Logs activities */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm md:col-span-2">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Operations Audit Trails</h2>
              
              <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                {analytics.recentActivities.length === 0 ? (
                  <p className="text-slate-400 text-center py-8 text-xs">No audit logs logged yet</p>
                ) : (
                  analytics.recentActivities.map(log => (
                    <div key={log._id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-primary font-mono">{log.action}</span>
                        <span className="text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-600">
                        Executed by: <span className="font-semibold text-slate-800">{log.user?.name} ({log.user?.role})</span>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-[10px] text-slate-500 font-mono bg-white p-1.5 rounded-lg border border-slate-100">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Severity ratio graph widget */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm md:col-span-1 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-slate-850 uppercase tracking-wider mb-3">Severity Breakdown</h2>
                <div className="space-y-3 text-xs">
                  {['critical', 'high', 'medium', 'low'].map(severity => {
                    const count = analytics.severityBreakdown[severity] || 0;
                    const total = analytics.stats.totalRequests || 1;
                    const pct = ((count / total) * 100).toFixed(0);

                    return (
                      <div key={severity} className="space-y-1">
                        <div className="flex justify-between text-slate-600 font-medium">
                          <span className="capitalize">{severity}</span>
                          <span className="font-bold text-slate-800">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              severity === 'critical' ? 'bg-red-500' : severity === 'high' ? 'bg-orange-500' : severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-850 uppercase tracking-wider mb-3">Category Breakdown</h2>
                <div className="space-y-3 text-xs">
                  {Object.keys(analytics.categoryBreakdown).map(cat => {
                    const count = analytics.categoryBreakdown[cat] || 0;
                    const total = analytics.stats.totalRequests || 1;
                    const pct = ((count / total) * 100).toFixed(0);

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-slate-600 font-medium">
                          <span className="capitalize">{cat}</span>
                          <span className="font-bold text-slate-800">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {selectedIncidentForReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">
              Review Rescue Proof & Resolution
            </h3>
            
            <div className="space-y-4 text-xs">
              <div>
                <p className="font-extrabold text-slate-500 uppercase tracking-wider mb-1">Incident Title</p>
                <p className="text-slate-800 font-semibold">{selectedIncidentForReview.title}</p>
              </div>

              <div>
                <p className="font-extrabold text-slate-500 uppercase tracking-wider mb-1">Volunteer Responder</p>
                <p className="text-slate-800 font-semibold">
                  {selectedIncidentForReview.assignedVolunteer?.name || 'Assigned Volunteer'}
                </p>
              </div>

              <div>
                <p className="font-extrabold text-slate-500 uppercase tracking-wider mb-1">Resolution Summary Report</p>
                <p className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-650 leading-relaxed max-h-24 overflow-y-auto">
                  {selectedIncidentForReview.resolutionReport || 'No report submitted.'}
                </p>
              </div>

              {selectedIncidentForReview.resolutionImage && (
                <div>
                  <p className="font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Confirmation Image (Proof)</p>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center max-h-60">
                    <img 
                      src={selectedIncidentForReview.resolutionImage} 
                      alt="Rescue Confirmation Proof" 
                      className="max-h-60 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => handleConfirmResolution(selectedIncidentForReview._id)}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-light text-white font-extrabold rounded-xl transition shadow-sm"
              >
                Confirm Rescue
              </button>
              <button
                onClick={() => setSelectedIncidentForReview(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
