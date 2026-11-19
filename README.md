# CP TechFix

## Setup

### Backend
```
cd backend
npm install
cp .env.example .env
# configure DATABASE_URL
npm run db:push
npm run db:seed
npm run dev
```

### Frontend
```
cd frontend
npm install
npm run dev
```

Default accounts (after seed):
- Admin: admin@cptechfix.com / Admin123!
- Staff: staff@cptechfix.com / Staff123!
- Customer: customer@cptechfix.com / Customer123!

## Deployment

### Database (Neon)
1. Create a Neon PostgreSQL project.
2. Copy the connection string into backend `DATABASE_URL`.

### Backend (Render)
1. Create a Web Service pointing to `backend/`.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (frontend URL), `FRONTEND_URL`, optional `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`.
5. Run `npm run db:push && npm run db:seed` once (via shell) to initialize schema and seed data.

### Frontend (Vercel)
1. Import the `frontend/` folder.
2. Set `VITE_API_URL` to your Render backend URL + `/api` (e.g. `https://cptechfix-backend.onrender.com/api`).
3. Deploy. `vercel.json` handles SPA routing.
