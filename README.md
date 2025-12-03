## 🚀 TinyHawk URL Shortener
[![License](https://img.shields.io/github/license/Ark-Barua/url-shorter?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/Ark-Barua/url-shorter?style=for-the-badge)](https://github.com/Ark-Barua/url-shorter/stargazers)
[![Forks](https://img.shields.io/github/forks/Ark-Barua/url-shorter?style=for-the-badge)](https://github.com/Ark-Barua/url-shorter/forks)
[![Issues](https://img.shields.io/github/issues/Ark-Barua/url-shorter?style=for-the-badge)](https://github.com/Ark-Barua/url-shorter/issues)

[![NodeJS](https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge)](#)
[![Express](https://img.shields.io/badge/Framework-Express-lightgrey?style=for-the-badge)](#)
[![React](https://img.shields.io/badge/Frontend-React-blue?style=for-the-badge)](#)
[![Vite](https://img.shields.io/badge/Build-Vite-purple?style=for-the-badge)](#)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38bdf8?style=for-the-badge)](#)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=for-the-badge)](#)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-316192?style=for-the-badge)](#)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge)](https://vercel.com)
[![Render](https://img.shields.io/badge/Backend-Render.com-blue?style=for-the-badge)](https://render.com)

A modern, fast, full-stack URL shortener with analytics, QR codes, geolocation tracking, and a clean UI.

## 📸 Demo
1. **Live Frontend**

https://url-shorter-flax-tau.vercel.app/

2. **Live Backend API** 

https://tinyhawk-backend.onrender.com

## ✨ Features

- Shorten long URLs instantly
- Custom aliases (optional)
- Advanced analytics
    - Click count
    - Daily time-series
    - Geolocation (country / region / city)
    - Referrer tracking
    - Browser user-agent
- IP geolocation using ipapi.co (free)
- QR code generation
- Instant response with REST API
- PostgreSQL + Prisma ORM
- Beautiful, responsive UI (Vite + React + Tailwind)
- Backend deployed on Render
- Frontend deployed on Vercel

## 🏗️ Architecture

```
url-shorter/
├── server/               # Express backend
│   ├── index.js
│   ├── prisma/
│   │   ├── schema.prisma
│   └── ...
└── src/                  # Frontend (React + Vite)
    ├── pages/
    ├── components/
    └── ...
```

## 🧰 Tech Stack

1. Frontend
- React (Vite)
- Tailwind CSS
- Axios

2. Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL (Render)
- ipapi.co for geolocation data

3. DevOps
- Render (Backend Hosting)
- Vercel (Frontend Hosting)
- GitHub (Version control)

## 🔗 API Endpoints

1. Health Check

```
GET /api/health
```

2. Shorten URL

```
POST /api/shorten
Body: { "originalUrl": "https://example.com" }
```

3. Redirect

```
GET /:shortCode
```

4. Analytics

```
GET /api/stats/:shortCode
```

## ⚙️ Environment Variables

1. Backend (server/.env)

```
DATABASE_URL=postgresql://....
PORT=4000
BASE_URL=https://tinyhawk-backend.onrender.com
GEO_PROVIDER=ipapi
GEO_API_KEY=
```

2. Frontend (.env)

```
VITE_API_BASE=https://tinyhawk-backend.onrender.com
```

## 🛠️ Local Development

1. Clone repo

```
git clone https://github.com/Ark-Barua/url-shorter.git
cd url-shorter
```

2. Setup backend

```
cd server
npm install
npx prisma generate
npx prisma db push
npm start
```

3. Setup frontend

```
cd ..
npm install
npm run dev
```

## Deployment

1. Backend (Render):
- Web Service
- Root directory: ```server```
- Build command:
```
npm install && npx prisma generate
```
- Start command:
```
npm start
```
2. Frontend (Vercel):
- Framework: Vite
- Root directory: ```/```
- Build command:
```
npm run build
```
- Output folder: dist

## 🧾 License

[![View License](https://img.shields.io/badge/View%20License-MIT-green?style=for-the-badge)](License)

## 👨‍💻 Author
**Ark Barua**

**🔗 GitHub: https://github.com/Ark-Barua**

**🔥 Built with passion and perfection.**
