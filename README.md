# The Saviour – Real-Time Emergency Response & Disaster Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express.js-v5-black.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-2dsphere%20GIS-green.svg)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4-black.svg)](https://socket.io/)

**The Saviour** is a production-grade, full-stack real-time emergency response and disaster management web platform. Designed to eliminate communication delays during natural disasters and urban crises, the platform bridges the gap between citizens in distress, volunteer first responders, and emergency control room administrators.

---

## 🌟 Key Features & Capabilities

- 🚨 **Guest Anonymous SOS**: Single-click critical emergency submission from the landing page without requiring account registration.
- 📍 **GIS Interactive Mapping**: Precise location coordinate selection using Leaflet maps & browser Geolocation.
- ⚡ **Real-Time WebSockets Engine**: Bidirectional Socket.io events for live responder tracking (`update-location`) and targeted notification delivery.
- 🛰️ **Spatial Proximity Matching**: Utilizes MongoDB `2dsphere` spatial indexing for instant volunteer-to-incident distance calculation.
- 🛡️ **Role-Based Security & Approvals**: JWT stateless authentication, Bcrypt password hashing, rate limiting, and an admin verification gate (`isApproved`) for volunteer onboarding.
- 📊 **Admin Command Center**: Visual dashboard displaying analytics charts, user approval controls, audit logs, and an interactive global GIS incident map.
- 🔄 **Multi-Stage Rescue Lifecycle**: State machine tracking rescue progression (`pending` → `assigned` → `accepted` → `reached` → `in_progress` → `completed` → `confirmed`).
- 📷 **Resolution Proof Uploads**: Multi-part image uploading via Cloudinary for incident verification and resolution reports.
- ⭐ **Victim Rating System**: Post-rescue 1–5 star rating system for responder performance evaluation.

---

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework**: React 19 (Vite build pipeline)
- **Styling & Icons**: Tailwind CSS v4, Framer Motion, Lucide-React
- **Maps & GIS**: Leaflet.js, React-Leaflet
- **Real-Time Client**: Socket.io-Client v4
- **State & HTTP**: React Context API (`AuthContext`, `SocketContext`), Axios with token refresh interceptors

### Backend (Server)
- **Runtime & API**: Node.js, Express.js v5 REST API
- **Database & ODM**: MongoDB with Mongoose ODM (`2dsphere` spatial indexing)
- **Real-Time Engine**: Socket.io v4 Server with JWT handshake authentication
- **Security & Storage**: JWT (Access & Refresh Tokens), Bcrypt, Helmet, CORS, Express-Rate-Limit, Express-Validator, Multer, Cloudinary SDK

---

## 📁 Directory Structure

```
TheSaviourREAL/
├── client/                      # React 19 Single Page Application (Vite)
│   ├── public/                  # Public static assets & favicon
│   ├── src/
│   │   ├── components/          # Navbar & ProtectedRoute guard components
│   │   ├── context/             # AuthContext & SocketContext state providers
│   │   ├── pages/               # Landing, User, Volunteer, Admin, Auth views
│   │   ├── services/            # Axios API client & interceptors
│   │   ├── App.jsx              # Main router setup
│   │   ├── index.css            # Tailwind CSS directives
│   │   └── main.jsx             # React entry point
│   ├── .env.example             # Client environment template
│   ├── package.json             # Client dependencies
│   └── vite.config.js           # Vite configuration
│
└── server/                      # Node.js Express & Socket.io Server
    ├── public/                  # Static file upload storage fallback
    ├── src/
    │   ├── config/              # MongoDB & Cloudinary SDK configurations
    │   ├── constants/           # Roles, statuses, categories, severities
    │   ├── controllers/         # Auth, Emergency, Admin, Notification logic
    │   ├── middlewares/         # Auth guard, RBAC, Rate-limiter, Error handling
    │   ├── models/              # User, EmergencyRequest, Notification, ActivityLog
    │   ├── routes/              # Express API endpoints (/api/...)
    │   ├── services/            # FileUpload, Notification, SocketService
    │   ├── utils/               # AppError, response formatters, JWT tokens
    │   ├── validators/          # Server-side input validation schemas
    │   ├── index.js             # HTTP server & Socket.io entry point
    │   ├── seed.js              # System account seeder script
    │   └── seedMissions.js      # Demo mission data seeder script
    ├── .env.example             # Server environment template
    └── package.json             # Server dependencies
```

---

## ⚙️ Environment Configuration

### 1. Server Environment Setup (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/disaster_response
JWT_SECRET=supersecretjwtkeyforcommunitydisasterresponseplatform123
JWT_REFRESH_SECRET=supersecretrefreshjwtkeyforcommunitydisasterresponseplatform123
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=mock_cloud
CLOUDINARY_API_KEY=mock_key
CLOUDINARY_API_SECRET=mock_secret
```

### 2. Client Environment Setup (`client/.env`)
Copy `client/.env.example` to `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v18.0+ and npm installed
- MongoDB installed locally OR a MongoDB Atlas connection string

### 1. Install Dependencies
```bash
# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 2. Seed System Accounts & Demo Data
```bash
cd server
npm run seed
```
> **Default Admin Account Credentials**:  
> **Email**: `admin@thesaviour.com`  
> **Password**: `Admin@123`

### 3. Run Development Servers

**Start Backend Server:**
```bash
cd server
npm run dev
# Server listening on http://localhost:5000
```

**Start Frontend Client (in a separate terminal):**
```bash
cd client
npm run dev
# Vite dev server listening on http://localhost:5173
```

---

## 📡 REST API Summary

| Endpoint Route | Method | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Public (Rate-Limited) | Register Citizen or Volunteer account |
| `/api/auth/login` | `POST` | Public (Rate-Limited) | Authenticate user & receive JWT tokens |
| `/api/auth/me` | `GET` | Protected | Fetch current logged-in user profile |
| `/api/emergencies/public-stats` | `GET` | Public | Fetch statistics for landing page |
| `/api/emergencies/guest` | `POST` | Public | Submit one-click anonymous Guest SOS alert |
| `/api/emergencies` | `GET` | Protected | Fetch emergency requests (Dynamic by role) |
| `/api/emergencies` | `POST` | Citizen Only | Raise a new emergency request with image proof |
| `/api/emergencies/:id/assign` | `PATCH` | Admin Only | Assign / reassign volunteer to incident |
| `/api/emergencies/:id/status` | `PATCH` | Volunteer Only | Update rescue mission status & upload report |
| `/api/emergencies/:id/rate` | `PATCH` | Citizen Only | Rate volunteer performance (1–5 stars) |
| `/api/admin/users` | `GET` | Admin Only | List system users & volunteers with ratings |
| `/api/admin/users/:id/status` | `PATCH` | Admin Only | Approve, reject, suspend, or activate users |
| `/api/admin/analytics` | `GET` | Admin Only | Fetch command center analytics & activity logs |

---

## 🔒 Security & Code Standards

- **Passowrd Hashing**: Bcrypt with 10 salt rounds.
- **Stateless Authorization**: JWT access tokens (15m) + refresh tokens (7d).
- **Security Headers**: Helmet.js HTTP protection & CORS restriction.
- **Input Sanitization**: Express-Validator input filtering on all POST/PATCH endpoints.
- **File Upload Guard**: Multer MIME-type checking & 5MB file size limits.

---

## 📄 Academic Project Report

The complete, submission-ready **PBL Project Report** formatted to VTU / BMSITM MCA academic standards is available in the root directory:
- `The_Saviour_PBL_Project_Report.docx` (Microsoft Word Document with Times New Roman formatting, page numbers, justified text alignment, and tables)
- `The_Saviour_PBL_Project_Report.md` (Markdown Document with Mermaid diagrams)

---

## 📜 License

This project is licensed under the **MIT License** — free for academic and non-commercial educational use.
#   T h e - S a v i o u r  
 