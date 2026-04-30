# Backend API for Insighta Labs+
Secure OAuth2-powered backend for profile intelligence system with role-based access control

## Features
- 🔐 GitHub OAuth2 authentication with PKCE security
- 🔑 JWT token authentication (3m access, 5m refresh)
- 👥 Role-based access control (Admin, Analyst)
- 🌐 API versioning (X-API-Version header required)
- 📊 RESTful endpoints for profile management
- 🔎 Natural language search parsing
- 📁 CSV export functionality
- ⚖️ Rate limiting (10/min auth, 60/min API)
- 📝 Request logging with response times

## Installation
```bash
# Clone repository
git clone https://github.com/your-repo/hng14-BE-04
cd hng14-BE-04

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Environment Variables
```env
MONGO_URI="your_mongodb_connection_string"
GITHUB_CLIENT_ID="your_github_app_id"
GITHUB_CLIENT_SECRET="your_github_app_secret"
JWT_SECRET="secure_jwt_secret"
JWT_REFRESH="secure_jwt_refresh_secret"
FRONTEND_URL="http://localhost:5173"
GITHUB_CALLBACK_URL="http://localhost:5000/auth/github/callback"
```

## API Structure
```
/auth
  /github          - Initiates GitHub OAuth flow
  /github/callback - Handles OAuth callback
  /refresh         - Refreshes access tokens
  /logout          - Invalidates sessions
  
/api/profiles
  GET /            - List profiles (paginated)
  POST /           - Create profile (Admin only)
  GET /export      - Export profiles as CSV 
  DELETE /:id      - Delete profile (Admin only)
  GET /search      - Natural language search
```

## Running the Server
```bash
# Development
npm run dev

# Production
npm start
```

## Deployment
Deploy to any Node.js hosting platform:
```bash
# Heroku
heroku create
git push heroku main

# AWS Elastic Beanstalk
eb init
eb create
```

## Contributing
1. Create feature branch: `git checkout -b feat/new-feature`
2. Commit changes: `git commit -m "feat(new-feature): implement xyz"`
3. Push to branch: `git push origin feat/new-feature`
4. Open pull request

## License
MIT
```

---

