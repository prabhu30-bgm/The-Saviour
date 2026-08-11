# The Saviour

**The Saviour** is a full-stack, real-time community disaster-response platform. It helps people report emergencies, enables administrators to coordinate responders, and gives vetted volunteers a live workflow for handling rescue missions.

The application is built as a MERN-style project with a React single-page application, an Express/Socket.IO API, and MongoDB for persistent data and geospatial queries.

## Key capabilities

- Role-based accounts for users, volunteers, and administrators
- JWT access and refresh token authentication
- Volunteer registration, administrator approval, activation, suspension, and removal
- Authenticated emergency reports with optional image uploads
- Guest SOS reporting from the public landing page
- End-to-end rescue workflow: assignment, acceptance, arrival, rescue, completion, confirmation, and rating
- Real-time notifications and volunteer location updates through Socket.IO
- Leaflet maps for emergency locations, volunteer locations, and dispatch visibility
- MongoDB GeoJSON `Point` data and `2dsphere` indexes
- Cloudinary upload support with a local `/uploads` fallback
- Activity logging, dashboard analytics, validation, rate limiting, and centralized API errors
- Secure, expiring password-reset tokens with client reset screens

## Technology stack

| Area | Technology |
| --- | --- |
| Client | React 19, Vite, React Router, Tailwind CSS, React Hook Form |
| Maps | Leaflet and React-Leaflet |
| Real-time | Socket.IO client and server |
| API | Node.js, Express 5, Axios |
| Database | MongoDB and Mongoose |
| Security | JWT, bcrypt, Helmet, Express Rate Limit, Express Validator |
| Uploads | Multer, Cloudinary (optional) |

## Architecture

```text
Browser (React/Vite)
  ├── Authentication and role-aware routing
  ├── User, volunteer, and admin dashboards
  ├── Leaflet maps and browser geolocation
  └── Socket.IO notifications/location streaming
              │ HTTP + WebSocket
              ▼
Express API + Socket.IO server
  ├── Routes, controllers, middleware, and validators
  ├── JWT/RBAC authorization
  ├── Upload and notification services
  └── Activity logging
              │
              ▼
MongoDB
  ├── Users
  ├── Emergency requests
  ├── Notifications
  └── Activity logs
```

## Project structure

```text
TheSaviourREAL/
├── client/                         # React application
│   ├── public/                     # Static public assets
│   ├── src/
│   │   ├── components/             # Shared UI components and route guard
│   │   ├── context/                # Authentication and Socket.IO providers
│   │   ├── pages/                  # Public, auth, and role dashboard pages
│   │   ├── services/               # Axios API client and token refresh logic
│   │   ├── App.jsx                 # Client routes
│   │   └── main.jsx                # React entry point
│   ├── .env.example
│   └── package.json
├── server/                         # Express and Socket.IO application
│   ├── public/uploads/             # Local upload fallback directory
│   ├── src/
│   │   ├── config/                 # Database and Cloudinary configuration
│   │   ├── constants/              # Roles, statuses, categories, severities
│   │   ├── controllers/            # API business logic
│   │   ├── middlewares/            # Auth, errors, and upload middleware
│   │   ├── models/                 # Mongoose schemas
│   │   ├── routes/                 # Express route definitions
│   │   ├── services/               # Notification, Socket.IO, and file services
│   │   ├── utils/                  # Tokens, errors, and API responses
│   │   ├── validators/             # Request validation rules
│   │   ├── index.js                # HTTP/Socket.IO server setup
│   │   ├── seed.js                 # Development account seeder
│   │   └── seedMissions.js         # Development mission seeder
│   ├── .env.example
│   └── package.json
├── .gitignore
└── package.json                    # Workspace commands
```

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- MongoDB locally or a MongoDB Atlas connection string
- A modern browser with location permission enabled for live location features

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/prabhu30-bgm/The-Saviour.git
cd The-Saviour
```

### 2. Configure the server

Copy the environment template and replace the development values with secure local values.

```bash
copy server\.env.example server\.env
```

On macOS/Linux:

```bash
cp server/.env.example server/.env
```

Required server variables:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/disaster_response
JWT_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

Cloudinary is optional. Leave its sample values in place to use local file storage, or provide valid Cloudinary credentials to upload incident images to Cloudinary.

### 3. Configure the client

```bash
copy client\.env.example client\.env
```

On macOS/Linux:

```bash
cp client/.env.example client/.env
```

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Install dependencies

```bash
npm install
npm run install-all
```

### 5. Seed development data (optional)

> Warning: `npm run seed` clears the application collections before creating development accounts. Never run it against a production database.

```bash
npm run seed
npm run seed-missions
```

### 6. Start the application

Start both services:

```bash
npm run dev
```

Or run each service separately:

```bash
npm run server
npm run client
```

The API runs on `http://localhost:5000` and the Vite client normally runs on `http://localhost:5173`.

## Roles and rescue workflow

### User

Users register, create emergency reports, provide a map location and optional image, track the assigned volunteer, receive notifications, cancel eligible requests, and rate completed rescues.

### Volunteer

Volunteers register and wait for administrator approval. Once approved, they receive assigned missions, share location updates, progress mission status, and can attach a resolution image/report on completion.

### Administrator

Administrators approve and manage volunteers, view system analytics and live maps, assign or reassign volunteers, reject invalid requests, confirm resolutions, and review activity history.

```text
User/guest submits an SOS or emergency report
          ↓
Administrators receive a real-time alert
          ↓
Administrator assigns an approved volunteer
          ↓
Volunteer accepts and updates rescue progress
          ↓
User, volunteer, and administrators receive notifications
          ↓
Volunteer completes the mission; administrator confirms it
          ↓
User can submit a rating
```

## API overview

All API routes are prefixed with `/api`.

| Area | Representative endpoints |
| --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout` |
| Password reset | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Emergencies | `GET/POST /emergencies`, `POST /emergencies/guest`, `PATCH /emergencies/:id/assign`, `PATCH /emergencies/:id/status` |
| Administration | `GET /admin/users`, `PATCH /admin/users/:id/status`, `GET /admin/analytics` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/mark-all-read` |

Protected endpoints require an `Authorization: Bearer <access-token>` header. Route handlers additionally enforce role restrictions server-side.

## Real-time events

The server authenticates Socket.IO connections with the access token. It uses personal user rooms and role rooms for notification delivery.

| Event | Direction | Purpose |
| --- | --- | --- |
| `notification` | Server → client | Delivers a persisted notification in real time |
| `update-location` | Volunteer → server | Shares `{ latitude, longitude }` |
| `volunteer-location-updated` | Server → administrators | Updates live map marker data |
| `volunteer-status-change` | Server → admins | Signals volunteer connection changes |

## Scripts

| Command | Description |
| --- | --- |
| `npm run install-all` | Installs client and server dependencies |
| `npm run dev` | Starts client and server together |
| `npm run server` | Starts the backend in watch mode |
| `npm run client` | Starts the Vite client |
| `npm run seed` | Resets and seeds development data |
| `npm run seed-missions` | Adds a sample completed rescue mission |
| `npm run build --prefix client` | Creates the production client build |
| `npm run lint --prefix client` | Lints the client source |

## Security and deployment notes

- Do not commit `.env` files, database URLs, JWT secrets, Cloudinary credentials, or production tokens.
- Set strong, unique JWT secrets for every deployment environment.
- Restrict Express and Socket.IO CORS origins before deploying publicly.
- Configure a production MongoDB database with backups and restricted network access.
- Use Cloudinary or another durable object-storage provider in production; local uploads are a fallback only.
- Password-reset links are returned only in development to support local testing. Configure a dedicated transactional email provider before enabling production reset delivery.
- Serve the client over HTTPS so browser geolocation works reliably in production.

## Verification

```bash
npm run lint --prefix client
npm run build --prefix client
```

The API health endpoint is available at:

```text
GET http://localhost:5000/
```

## License

This project is intended for academic and community-response use. Add a license file that reflects the intended distribution terms before using it in a public production deployment.
