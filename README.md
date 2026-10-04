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

## Deploy frontend and backend to Netlify

The Netlify site serves the Vite storefront and routes `/api/*` to the Express API as a Netlify Function. Netlify Functions are ephemeral, so production requires Supabase for both the database and uploaded images; the local JSON-file database is for development only.

1. Create a Supabase project. Run `supabase/schema.sql` in its SQL editor; this also creates the public `formo-media` image bucket.
2. Set the server environment variables listed below in **Netlify → Site configuration → Environment variables**. Use the Supabase **service role** key only as a server-side secret; never add it to a `VITE_` variable.
3. Initialize a new, empty Supabase database with the starter catalogue and admin account. With the same variables in `server/.env`, run `npm run seed` from the repository root. **Seeding resets all application tables**, so do not run it against a database containing data you need to keep.
4. In Netlify, import `https://github.com/harshith190/formo3D` as a site. `netlify.toml` configures the build, publish directory, function, and SPA/API routes. Deploy the site and check `https://<your-site>.netlify.app/api/health`.
5. Add a custom domain in Netlify if needed. Edit `client/src/site.js` to update the storefront's business details.

Required Netlify environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` — use a long, random secret; production startup rejects the development default.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` — used when the starter admin account is created by the seed command.

Optional variables:

- `SUPABASE_BUCKET` — defaults to `formo-media`.
- `ADMIN_NAME`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `FREE_SHIPPING_OVER`, and `SHIPPING_FEE`.

For local development, the Express server still uses the JSON-file database and local uploads when Supabase is not configured. For a traditional persistent Node host instead, `npm run build` followed by `npm start` serves the built storefront and API from one service.
