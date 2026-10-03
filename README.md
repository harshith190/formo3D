# FORMO store

Online store for FORMO toys: flexi animals, fidget toys and figurines, with colour and size options and custom orders.

- **client/**: React + Vite storefront and admin (`/admin`, loaded as a separate bundle)
- **server/**: Node + Express API
- **supabase/schema.sql**: PostgreSQL schema for production

## Run locally

```bash
npm run install:all
npm run seed      # resets the database to the starter catalogue
npm run dev       # API on :4000, store on http://localhost:5173
```

Admin: http://localhost:5173/admin. The login is `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env`.

Without Supabase settings, data is stored in `server/data/db.json` and uploads in `server/uploads/`.

## Adding products

Admin, then Products, then New product. Set the name, price, stock, colours, sizes (with extra price per size) and photos. No code changes are needed.

## Going live

1. **Database:** create a Supabase project, run `supabase/schema.sql` in the SQL editor, and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`. Run `npm run seed` once.
2. **Payments:** create a Razorpay account and set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. UPI, cards and netbanking then appear at checkout next to cash on delivery.
3. **Hosting on your domain:** `npm run build`, then `npm start`. The API serves the built store, so a single service (Render, Railway, a VPS) on your domain is enough. Set `NODE_ENV=production`, a long random `JWT_SECRET`, and `CORS_ORIGINS=https://yourdomain.in`.
4. **Business details:** edit `client/src/site.js` (email, city, domain). These appear in the footer, Privacy and Terms.
