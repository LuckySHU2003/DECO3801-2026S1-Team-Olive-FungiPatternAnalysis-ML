# DECO3801: Fungal Bioelectric Signal Analysis Platform

## Overview

This project aims to develop a data-driven platform for analysing fungal bioelectric signals. The system is designed to support researchers in processing raw electrical recordings, extracting meaningful features, applying machine learning models, and interpreting results through visualisation and automated summaries.

Fungal electrical activity is characterised by low-amplitude, noisy, and irregular signals, which makes manual analysis difficult. This platform provides a structured pipeline to standardise data processing and enable reproducible analysis workflows.

The system is currently under development. Several components are functional at a prototype level, while others are still being implemented or refined.

![Physical demo from Janet Wiles](readme/mushroom.jpeg)

---

## Objectives

- Provide a unified workflow for fungal signal analysis  
- Reduce manual preprocessing and analysis effort  
- Enable reproducible machine learning experiments  
- Support interpretation of complex signal patterns through visual and textual outputs  

---

## System Architecture

The platform follows a modular full-stack architecture consisting of:

### Frontend
- Vercel: for hosting frontend
- Web-based interface for dataset upload and analysis configuration  
- Visualisation of signals, extracted features, and model outputs  
- Display of generated textual interpretations  

### Backend
- Render: for hosting backend
- ML Models
- Handles data ingestion, preprocessing, modelling, and result delivery  

### Data Processing Pipeline
- Signal cleaning and filtering  
- Feature extraction  
- Model execution  
- Result storage and retrieval  

### Storage
- MongoDB: for hosting database

## Team

Team Olive – DECO3801

- Gia Hao Vo  
- Febriani Patricia  
- Kanon Iizuka  
- Lucky Shu  
- Sihui Li  
- Zijun Lu  

---

## Setup (Preliminary)

### 1. Clone the repository

```bash
git clone https://github.com/justcallmeHao/DECO3801-FungiPatternAnalysis.git
cd DECO3801-FungiPatternAnalysis
```

---

### 2. Project Structure

```
frontend/   → React (Vite) client
backend/    → React (Node.js) + Express API
```

---

### 3. Install Dependencies

#### Frontend
```bash
cd frontend
npm install
```

#### Backend
```bash
cd ../backend
npm install
```

---

### 4. Environment Variables

Create `.env` files in both folders as examples. 
Note: if you decide to dev with localhost, .env.example is basically working.
If you decided to deploy MongoDB, Vercel, and Render, see instructions in Deployment Options.


#### `frontend/.env`
```env
VITE_API_URL=http://localhost:5000
```

#### `backend/.env`
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
```

---

### 5. Run Locally

#### Start backend
```bash
cd backend
npm run dev
```

#### Start frontend (new terminal)
```bash
cd frontend
npm run dev
```

- Frontend → http://localhost:5173  
- Backend → http://localhost:5000/api/health  

---

## Deployment Options

### Option 1 — Localhost (For dev)

- Uses local `.env` configuration  
- No external services required  
- Best for development and debugging  

---

### Option 2 — Full Deployment (Vercel + Render + MongoDB)

#### 1. MongoDB Atlas

- Create a free cluster  
- Create a database user (username + password)  
- For current status, add IP access: 0.0.0.0/0

![Mongo IP Setup](readme/mongo_ip.png)

- Copy connection string, update your password → use as `MONGODB_URI`
e.g. mongodb+srv://user:password@....qlgt2im.mongodb.net/?appName=...

![Mongo IP Connection](readme/mongo_connect.png)

---

#### 2. Backend (Render)

- Create a Web Service from GitHub repo  
- Set **Root Directory** → `backend`  
- Add environment variables:

```env
MONGODB_URI=your_connection_string (your MongoDB connection, as in section 1)
CLIENT_URL=https://your-frontend.vercel.app (your Vercel link, as in section 3)
```

- Deploy → copy backend URL

```
https://your-app.onrender.com
```
![Render: Success Deployment Example](readme/render_success.png)


---

#### 3. Frontend (Vercel)

- Import GitHub repo  
- Set **Root Directory** → `frontend`  
- Add environment variable:

```env
VITE_API_URL=https://your-backend.onrender.com (your Render link, as in section 2)
```

- Deploy → get frontend URL  

![Vercel: Success Deployment Example](readme/vercel_dashboard.png)

![Vercel: Template UI](readme/vercel_template.png)

---


## Notes

- `Cannot GET /` on backend root is expected - Render is only for backend (for now)
- Test backend via `/api/health`  
- Free Render instances may sleep (slow first request)  
- If Render run non-stop, probably check connection to MongoDB network access.

This repository represents an ongoing development project.  
Functionality, architecture, and implementation details are subject to change as the system evolves.
