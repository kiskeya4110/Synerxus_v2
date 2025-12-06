# Synerxus CSR Platform - Quick Start Guide

## 🚀 Get Running in 60 Seconds

### Step 1: Start the Platform
```bash
npm run synerxus
```

This single command:
- ✅ Installs all dependencies (Node.js + Python)
- ✅ Installs Tesseract OCR if missing
- ✅ Starts Python backend (port 8001)
- ✅ Starts Node.js backend + frontend (port 5000)
- ✅ Runs health checks
- ✅ Streams live logs

### Step 2: Seed Test Data (Optional)
```bash
# In a new terminal
npm run seed
```

This creates:
- 6 test users (3 volunteers, 3 organizations)
- 4 projects with real impact data
- 7 months of volunteer activity history
- Calendar events and tasks

### Step 3: Open Dashboard
```
http://localhost:5000/csr-dashboard
```

---

## 🎯 Key Features to Test

### 1. Real-time Dashboard Updates
- Watch KPIs refresh every 30 seconds
- Click any SDG to see volunteer breakdown
- Hover over map markers for project details
- Click funnel stages to drill down

### 2. AI Matchmaking
```bash
# Test the API
curl -X POST "http://localhost:8001/api/volunteers/1/simulate-match?top_n=3"

# Or view explanation in dashboard
# Click "How AI Matching Works" link → opens modal
```

### 3. Image Ingestion
```bash
# Upload a dashboard screenshot via API
curl -X POST http://localhost:8001/api/images/ingest \
  -F "file=@your_screenshot.png"

# Or use the UI
# Dashboard → Upload Screenshot → Select File → Process → Review → Accept
```

### 4. Run Tests
```bash
npm run test:python

# Expected: 15+ tests passing
# Coverage: Health, AI, OCR, Matching, Endpoints
```

---

## 📊 API Quick Reference

### Python Backend (Port 8001)
```bash
# Health check
curl http://localhost:8001/health

# Get KPIs
curl http://localhost:8001/api/kpis

# Get geographic impact
curl http://localhost:8001/api/geo-impact

# Get employee funnel
curl http://localhost:8001/api/employees/funnel

# Get admin actions
curl http://localhost:8001/api/admin/actions

# AI algorithm explanation
curl http://localhost:8001/api/ai/explain

# Simulate volunteer matching
curl -X POST "http://localhost:8001/api/volunteers/1/simulate-match?top_n=5"

# OCR image ingestion
curl -X POST http://localhost:8001/api/images/ingest \
  -F "file=@screenshot.png"

# Interactive API docs
open http://localhost:8001/docs
```

### Node.js Backend (Port 5000)
```bash
# CSR Dashboard data
curl "http://localhost:5000/api/csr/dashboard?userId=1"

# Engagement funnel
curl "http://localhost:5000/api/csr/engagement-funnel?userId=1"

# Pending admin actions
curl "http://localhost:5000/api/csr/pending-actions?userId=1"

# All projects
curl http://localhost:5000/api/projects

# All volunteers
curl http://localhost:5000/api/volunteers
```

---

## 🔧 Troubleshooting

### "Tesseract not found"
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# macOS
brew install tesseract

# Verify
tesseract --version
```

### "Port already in use"
```bash
# Kill existing process
lsof -ti:5000 | xargs kill -9  # Node backend
lsof -ti:8001 | xargs kill -9  # Python backend

# Or change ports in:
# - python_backend/main.py (line 238)
# - server/routes.ts (line 7543)
```

### "Database connection failed"
```bash
# Check PostgreSQL is running
psql --version

# Run migrations
npm run db:push

# Or check .env file for DATABASE_URL
```

### "Low OCR confidence"
- Use high-resolution screenshots (1200px+ width)
- Ensure good contrast (dark text, light background)
- Avoid rotated or skewed images
- Check image is clear and not blurry

---

## 📁 Project Structure

```
.
├── client/src/
│   ├── components/
│   │   ├── ai-explanation-modal.tsx      ← AI algorithm UI
│   │   └── image-ingestion-modal.tsx     ← OCR upload UI
│   └── pages/
│       └── csr-dashboard.tsx             ← Main dashboard
│
├── python_backend/
│   ├── main.py                           ← FastAPI app (OCR + AI)
│   ├── test_main.py                      ← 15+ tests
│   └── requirements.txt                  ← Python deps
│
├── server/
│   ├── routes.ts                         ← Express API routes
│   └── dashboard-service.ts              ← KPI aggregation
│
├── dummy/
│   └── seed-data.ts                      ← Test data generator
│
├── start-synerxus.sh                     ← Startup script
├── SYNERXUS_README.md                    ← Full docs
└── QUICKSTART.md                         ← This file
```

---

## 🎓 Learning Path

### Beginner
1. Start the platform
2. Explore the CSR dashboard
3. Upload a test screenshot
4. View AI explanation modal

### Intermediate
5. Seed the database
6. Test API endpoints with curl
7. Run Python tests
8. Modify Python backend

### Advanced
9. Add new KPIs to dashboard
10. Enhance OCR patterns
11. Customize AI matching weights
12. Deploy to production

---

## 📞 Help & Resources

- **Full Docs**: `SYNERXUS_README.md`
- **Implementation Details**: `SYNERXUS_IMPLEMENTATION_SUMMARY.md`
- **API Docs**: http://localhost:8001/docs (when running)
- **Seed Script**: `npm run seed`
- **Tests**: `npm run test:python`

---

**Need help?** Check the troubleshooting section above or consult the full README.

**Ready to deploy?** See the Production Deployment section in `SYNERXUS_README.md`.
