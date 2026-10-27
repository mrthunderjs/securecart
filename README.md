# SecureCart

SecureCart is a complete Node.js/Express e-commerce application with SQLite persistence, session authentication, role-based administration, CSRF protection, secure headers, rate limiting, validated forms, image upload restrictions, cart and checkout flows.

## Requirements

Node.js 18+ and npm. SQLite is embedded through `better-sqlite3`; no external database service is required.

## Setup and running

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Open `http://localhost:3000`. The database and deterministic seed catalog are created automatically on first startup.

Demo accounts: `admin@securecart.com` / `Admin@123` and `user@securecart.com` / `User@123`. Change these credentials before production use.

## Features

Catalog search, categories, pagination, product details and related products; registration/login/logout and mock password reset; cart, stock-aware checkout, order history and profile; admin statistics, product creation/deletion and safe image uploads; contact messages; responsive Bootstrap UI.

## API and routes

HTML routes include `GET /`, `GET /products/:slug`, `GET /categories/:slug`, `GET/POST /login`, `GET/POST /register`, `POST /logout`, `GET/POST /cart`, `GET/POST /checkout`, `GET /dashboard`, `GET/POST /contact`, and protected `/admin` routes. Mutating requests require the CSRF token emitted in forms.

## Security

Helmet CSP, HttpOnly/SameSite cookies, CSRF tokens, bcrypt password hashes, parameterized SQLite queries, express-validator validation, rate limiting, safe local redirects, restricted upload MIME types and size, access-control middleware, generic error responses and Morgan request logging are enabled by default. Set a strong `SESSION_SECRET` and HTTPS-aware production proxy configuration when deploying.

## Deployment

`Dockerfile` and `docker-compose.yml` are included. Railway and Render can deploy the Dockerfile; configure `PORT`, `SESSION_SECRET`, `NODE_ENV=production`, and persistent storage for `database/` and `uploads/`.

## Folder structure

`database/` persistence and seeding; `middleware/` security and access control; `routes/` MVC HTTP routes; `views/` EJS templates; `public/` browser assets; `uploads/` validated product images; `tests/` automated tests.

## Testing

Run `npm test` after installing dependencies. Tests exercise startup, authentication-related routes, catalog rendering and CSRF behavior.
