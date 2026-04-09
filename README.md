# ERAS — Emergency Report & Alert System
### Operator & Admin Dashboard

**Course:** Component Based Software Development  
**Project Title:** ERAS — AI-Assisted Emergency Dispatch Dashboard  
**University:** Adama Science and Technology University  
**Department:** Computer Science and Engineering

---

## Overview

ERAS (Emergency Report & Alert System) is a comprehensive web-based dashboard for managing emergency incidents, stations, operators, and citizens. The system provides role-based interfaces for administrators and operators to efficiently handle emergency responses.

### Live Demo

🔗 **Production:** [dashboard-ivory-three-87.vercel.app](https://dashboard-ivory-three-87.vercel.app)

---

## Features

### Admin Dashboard
- **Station Management**: Create, view, and delete emergency stations (Police, Medical, Fire)
- **Interactive Map**: Hybrid satellite view with clickable station markers showing detailed information
- **Operator Management**: Add, manage, and reset passwords for station operators
- **KYC Management**: Review and approve citizen identity verification documents
- **Citizen Management**: View and manage registered citizens
- **Real-time Statistics**: Dashboard with live counts and analytics

### Operator Dashboard
- **Incident Management**: View, filter, and update emergency incident statuses
- **Status Workflow**: Enforced transition chain (routed → in_progress → resolved)
- **Audio Playback**: Built-in audio player for incident voice recordings
- **Geospatial View**: Interactive map showing incident locations with color-coded markers
- **Detail Panel**: Comprehensive incident information including transcriptions (Amharic & English)
- **Station Information**: Display assigned station details in sidebar

### Key Technical Features
- **Role-Based Access Control**: Secure authentication with automatic role-based routing
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Real-time Updates**: Optimistic UI updates for instant feedback
- **Interactive Maps**: Leaflet integration with hybrid satellite imagery
- **SSR-Safe**: Proper server-side rendering with Next.js App Router
- **Type Safety**: Full TypeScript implementation

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui (Radix UI primitives)
- **Maps**: Leaflet + react-leaflet
- **Icons**: Lucide React
- **Deployment**: Vercel

---

## Getting Started

### Prerequisites

- Node.js 24.x or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/amire49/dashboard.git
cd dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=https://eras-backend.onrender.com
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3001](http://localhost:3001) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
dashboard/
├── app/                      # Next.js App Router pages
│   ├── admin/               # Admin pages
│   │   ├── citizens/        # Citizen management
│   │   ├── kyc/            # KYC verification
│   │   ├── operators/      # Operator management
│   │   ├── stations/       # Station management
│   │   └── page.tsx        # Admin dashboard
│   ├── operator/           # Operator pages
│   │   ├── incidents/      # Incident management
│   │   └── page.tsx        # Operator dashboard
│   ├── login/              # Authentication
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── admin/             # Admin-specific components
│   ├── incidents/         # Incident-related components
│   ├── layout/            # Layout components (Sidebar, Navbar)
│   └── ui/                # shadcn/ui components
├── lib/                   # Utility libraries
│   ├── api.ts            # API client with auth
│   ├── auth.ts           # Authentication utilities
│   ├── useAuth.ts        # Auth hook
│   └── utils.ts          # Helper functions
├── types/                # TypeScript type definitions
│   └── index.ts
└── public/               # Static assets
```

---

## API Integration

The dashboard connects to the ERAS backend API for all data operations:

- **Authentication**: `/api/auth/login/`, `/api/auth/me/`
- **Admin**: `/api/admin/dashboard/`, `/api/admin/stations/`, `/api/admin/operators/`
- **Operator**: `/api/operator/dashboard/`, `/api/operator/incidents/`
- **Citizens**: `/api/admin/citizens/`, `/api/admin/kyc/`

All API requests include Bearer token authentication with automatic 401 handling and redirect to login.

---

## Key Components

### Authentication System
- Stateless token management with localStorage
- Role-based access control via `useAuth` hook
- Automatic redirect based on user role
- Centralized API request handling with token injection

### Station Map
- Hybrid satellite view with street labels
- Color-coded markers (Purple: Police, Green: Medical, Red: Fire)
- Clickable tooltips showing station name and type
- Detailed popups with full station information
- Automatic bounds fitting for optimal view

### Incident Management
- Real-time incident list with filtering
- Status transition enforcement
- Audio player for voice recordings
- Inline location maps
- Optimistic UI updates

### KYC Verification
- Document image viewer (ID front/back, selfie)
- Approve/reject workflow
- Rejection reason tracking
- Status badges and filtering

---

## Development Approach

### Component-Based Architecture
The project follows a strict component-based design with clear boundaries:

- **Auth Component**: Stateless token management and access control
- **Incidents Component**: Data fetching, filtering, and status lifecycle
- **Map Component**: Geospatial visualization with marker interaction
- **Layout Component**: Navigation and role-based UI
- **Admin Components**: Station, operator, and citizen management

### Integration Patterns
- **Centralized Request**: Single API client for all HTTP operations
- **Hook-based Access Control**: Reusable `useAuth` hook
- **Optimistic UI Updates**: Instant feedback without waiting for server
- **Dynamic Imports**: SSR-safe component loading for Leaflet
- **Shared State**: Single source of truth across views

---

## Deployment

The application is deployed on Vercel with automatic deployments from the `main` branch.

### Environment Variables (Vercel)
- `NEXT_PUBLIC_API_URL`: Backend API base URL

### Build Configuration
- **Node.js Version**: 24.x
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

---

## Contributing

This is an academic project for Component Based Software Development course at Adama Science and Technology University.

---

## License

This project is part of an academic assignment and is not licensed for commercial use.

---

## Contact

**Developer**: Amir Nasir  
**University**: Adama Science and Technology University  
**Department**: Computer Science and Engineering

---

## Acknowledgments

- Next.js team for the excellent framework
- shadcn for the beautiful UI components
- Leaflet for the mapping library
- ERAS backend team for the API
