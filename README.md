# E-Logbook Maritime

Digital management system for Indonesian fishing industry with **Flutter Mobile App Integration**.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MySQL 8.0+
- npm or yarn

### Installation

1. **Clone repository**
```bash
git clone <repository-url>
cd e_logbook
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm start
```

3. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

## 📱 Mobile App Development

### Quick Mobile Setup
```bash
cd backend
# Windows
setup-mobile-dev.bat

# Linux/Mac
bash setup-mobile-dev.sh

# Start mobile-optimized server
npm run dev:mobile
```

### Mobile API Documentation
- **📚 Complete Mobile Guide**: [MOBILE_API_GUIDE.md](backend/MOBILE_API_GUIDE.md)
- **🌐 Swagger UI**: http://localhost:5000/api-docs
- **📱 Mobile Endpoints**: `/api/mobile/*`

### Mobile User Roles
- **👨✈️ Nahkoda (Captain)**: Trip management, crew coordination, GPS tracking
- **👷♂️ ABK (Crew)**: Trip participation, location updates, emergency alerts

> **Note**: Only users with role `nahkoda` or `abk` can access mobile app. Admin creates these users via web dashboard.

## 🌐 Access
- **Frontend**: http://localhost:5173
- **API**: http://localhost:5000/api
- **Mobile API**: http://localhost:5000/api/mobile
- **Swagger Docs**: http://localhost:5000/api-docs
- **Login**: admin / admin123

## 📁 Project Structure
```
e_logbook/
├── backend/              # Node.js API server
│   ├── src/routes/mobile.js    # Mobile-specific endpoints
│   ├── MOBILE_API_GUIDE.md     # Flutter integration guide
│   ├── setup-mobile-dev.*      # Mobile dev setup scripts
│   └── swagger.yaml            # API documentation
├── frontend/             # React TypeScript app
├── mobile/              # Flutter mobile app (if exists)
├── scripts/             # Deployment scripts
├── docs/               # Documentation
└── README.md
```

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev          # Standard development
npm run dev:mobile   # Mobile-optimized (debug logging)
npm test            # Run tests
```

### Frontend Development
```bash
cd frontend
npm run dev    # Development server
npm run build  # Production build
```

### Mobile Development
```bash
cd backend
npm run dev:mobile   # Start with mobile-friendly config
# Check MOBILE_API_GUIDE.md for Flutter integration
```

## 📚 Documentation
- **📱 Mobile API Guide**: [MOBILE_API_GUIDE.md](backend/MOBILE_API_GUIDE.md)
- **🌐 API Endpoints**: [swagger.yaml](backend/swagger.yaml)
- **🔒 Security Checklist**: [SECURITY-CHECKLIST.md](docs/SECURITY-CHECKLIST.md)
- **🐧 Ubuntu Setup**: [UBUNTU_SETUP.md](docs/UBUNTU_SETUP.md)
- **🚀 VPS Deployment**: [VPS_DEPLOYMENT_GUIDE.md](docs/VPS_DEPLOYMENT_GUIDE.md)