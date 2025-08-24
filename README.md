# Hyperliquid Notify 🚀

An advanced, real-time notification system for Hyperliquid traders with comprehensive alerting, portfolio monitoring, and market analytics.

## ✨ Features

### 🔔 Advanced Alert System
- **Price Alerts**: Monitor price movements with various conditions (above, below, crosses)
- **Volume Spike Alerts**: Get notified of unusual trading activity
- **Funding Rate Alerts**: Track funding rate changes
- **Position P&L Monitoring**: Monitor profit/loss on your positions
- **Liquidation Risk Warnings**: Early warnings for potential liquidations
- **Order Fill Notifications**: Real-time order execution alerts
- **Balance Change Alerts**: Track wallet balance changes

### 📊 Real-Time Dashboard
- Live market data with WebSocket connections
- Portfolio overview with real-time updates
- Interactive price charts
- Position tracking and analytics
- Account summary with margin usage

### 🔐 Security & Authentication
- Secure JWT-based authentication
- Encrypted password storage
- Optional wallet connection for enhanced features
- No private keys required or stored

### 📱 Multi-Channel Notifications
- **In-App Notifications**: Real-time browser notifications
- **Email Alerts**: Customizable email notifications
- **Webhook Support**: Integrate with external services
- **Push Notifications**: Browser push notifications

### 🎨 Modern UI/UX
- Material-UI design system
- Responsive layout for all devices
- Dark/light theme support
- Professional trading interface
- Real-time data visualization

## 🛠️ Technology Stack

### Backend
- **Node.js** + **TypeScript** - Server runtime and type safety
- **Express.js** - Web application framework
- **Prisma** - Database ORM with PostgreSQL
- **Socket.io** - Real-time WebSocket communication
- **JWT** - Authentication and authorization
- **Nodemailer** - Email notification delivery
- **Axios** - HTTP client for API requests

### Frontend
- **React 18** + **TypeScript** - Modern UI framework
- **Material-UI (MUI)** - Component library and design system
- **React Query** - Data fetching and caching
- **React Router** - Client-side routing
- **Chart.js** - Data visualization
- **Socket.io Client** - Real-time updates

### External APIs
- **Hyperliquid API** - Market data and trading information
- **Hyperliquid WebSocket** - Real-time price and order updates

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and **npm** - [Download here](https://nodejs.org/)
- **Git** - For cloning the repository
- **PostgreSQL database** (optional - SQLite works for development)

### 1. Clone the Repository
```bash
git clone https://github.com/saltwalletxyz/hyper_notif.git
cd hyper_notif
```

### 2. One-Command Setup and Start
```bash
# Make the setup script executable and run it
chmod +x setup-and-start.sh
./setup-and-start.sh
```

**That's it! 🎉** The script will automatically:
- ✅ Check prerequisites (Node.js, npm)
- ✅ Install all dependencies (root, backend, frontend)
- ✅ Set up environment files
- ✅ Configure the database
- ✅ Start backend on port **5000**
- ✅ Start frontend on port **3002**
- ✅ Verify both services are running

### 3. Alternative: Manual Setup

If you prefer manual setup or the script doesn't work:

#### Backend Setup
```bash
cd backend
npm install

# Copy and configure environment file
cp .env.example .env
# Edit .env with your database URL and settings

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# Start backend server
npm run dev  # Runs on port 5000
```

#### Frontend Setup
```bash
cd frontend
npm install

# Copy environment file
cp .env.example .env
# Edit .env with API URLs

# Start frontend server
PORT=3002 npm start  # Runs on port 3002
```

### 4. Database Configuration
Update your `.env` file in the backend directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/hyperliquid_notify"

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secure-jwt-secret-here"

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Hyperliquid API (default values)
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_WS_URL=wss://api.hyperliquid.xyz/ws
```

## 📖 Usage Guide

### 1. Account Setup
1. **Register**: Create your account with email and password
2. **Connect Wallet**: Add your Hyperliquid wallet address for position monitoring
3. **Verify Setup**: Check the dashboard for live market data

### 2. Creating Alerts
1. **Navigate to Alerts**: Click on "Alerts" in the sidebar
2. **Create Alert**: Click the + button to create a new alert
3. **Configure**: Set alert type, asset, condition, and notification preferences
4. **Activate**: Ensure the alert is active and monitoring

### 3. Alert Types Explained

#### Price Alerts
- **Price Above/Below**: Trigger when price reaches a specific level
- **Price Change %**: Trigger on percentage price movements
- **Crosses Above/Below**: Trigger when price crosses a level

#### Advanced Alerts
- **Volume Spike**: Detect unusual trading volumes
- **Funding Rate**: Monitor funding rate changes
- **Liquidation Risk**: Early warning system for position risks
- **Order Filled**: Get notified when orders execute
- **Position P&L**: Monitor profit/loss thresholds
- **Balance Change**: Track wallet balance changes

### 4. Notification Channels
- **In-App**: Real-time notifications in the web app
- **Email**: Delivered to your registered email address  
- **Webhook**: POST requests to your specified endpoint

### 5. Dashboard Features
- **Market Overview**: Live prices for major assets
- **Portfolio Summary**: Account value and position overview
- **Recent Activity**: Latest alerts and notifications
- **Price Charts**: Real-time price visualization

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Authentication
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN=7d

# Hyperliquid API
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_WS_URL=wss://api.hyperliquid.xyz/ws

# Email Notifications
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3002
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=http://localhost:5000
```

### 5. Access the Application

Once both services are running, you can access:

- **🌐 Main Application**: http://localhost:3002
- **🔧 Backend API**: http://localhost:5000
- **❤️ Health Check**: http://localhost:5000/health
- **📊 Market Data**: http://localhost:5000/api/market/assets

### 6. Stopping the Application

To stop both services:
```bash
./stop.sh
```

Or press `Ctrl+C` if running the setup script interactively.

## 🛠️ Development Scripts

The repository includes several helpful scripts:

- **`./setup-and-start.sh`** - Complete setup and startup (recommended)
- **`./stop.sh`** - Stop all running services
- **Backend only**: `cd backend && npm run dev`
- **Frontend only**: `cd frontend && PORT=3002 npm start`

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
If you see port errors:
```bash
# Kill processes on the required ports
lsof -ti:5000 | xargs kill -9  # Backend port
lsof -ti:3002 | xargs kill -9  # Frontend port
```

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
brew services start postgresql  # macOS
sudo service postgresql start   # Linux

# Reset database (if needed)
cd backend
npx prisma migrate reset
npx prisma generate
```

#### Node.js Version Issues
```bash
# Check your Node.js version
node --version  # Should be 18.x or higher

# Install/update Node.js from https://nodejs.org/
# Or use nvm:
nvm install 18
nvm use 18
```

#### Frontend Won't Compile
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### Backend Won't Start
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Getting Help
- Check the log files: `tail -f logs/backend.log` and `tail -f logs/frontend.log`
- Ensure all environment variables are set in `.env` files
- Verify database connection string in `backend/.env`
- Make sure ports 5000 and 3002 are available

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Alerts
- `GET /api/alerts` - List user alerts
- `POST /api/alerts` - Create new alert
- `GET /api/alerts/:id` - Get specific alert
- `PUT /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert

### Notifications
- `GET /api/notifications` - List notifications
- `POST /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

### Market Data
- `GET /api/market/assets` - Get all asset contexts
- `GET /api/market/assets/:coin` - Get specific asset data
- `GET /api/market/funding-rates` - Get funding rates
- `GET /api/market/account-summary` - Get account summary

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests  
```bash
cd frontend
npm test
```

## 🚢 Deployment

### Backend Deployment
1. **Environment**: Set production environment variables
2. **Database**: Run migrations in production
3. **Build**: `npm run build`
4. **Start**: `npm start`

### Frontend Deployment
1. **Environment**: Set production API URLs
2. **Build**: `npm run build`
3. **Serve**: Deploy `build/` folder to your hosting platform

### Recommended Hosting
- **Backend**: Railway, Heroku, DigitalOcean
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Database**: Railway PostgreSQL, AWS RDS, PlanetScale

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Use TypeScript for type safety
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hyperliquid** for providing excellent API documentation and infrastructure
- **Material-UI** team for the beautiful component library
- **Prisma** for the amazing database toolkit
- Open source community for all the fantastic libraries used

## 📞 Support

- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions in GitHub Discussions
- **Email**: Contact us at contact.nikhil2002@gmail.com

## 🗺️ Roadmap

- [ ] Mobile app development (React Native)
- [ ] Advanced charting with TradingView integration  
- [ ] Portfolio analytics and performance tracking
- [ ] Social features and alert sharing
- [ ] Advanced risk management tools
- [ ] API rate limiting optimization
- [ ] Multi-exchange support

---

**Hyperliquid Notify** - Professional trading notifications for the modern trader ⚡
