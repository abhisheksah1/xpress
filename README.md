# KoseliXpress

Nepal-wide gift e-commerce portal — MERN stack with Tailwind CSS frontend and a fully customizable admin panel.

## Project Structure

```
Xpress/
├── backend/                    # Express.js REST API
│   ├── server.js               # Entry point
│   ├── .env.example            # Environment template
│   └── src/
│       ├── app.js              # Express app setup
│       ├── config/             # DB, Cloudinary, constants, env
│       ├── models/             # One Mongoose model per file
│       ├── services/           # Business logic (one responsibility)
│       │   └── payments/       # Khalti, eSewa, Fonepay, Stripe
│       ├── controllers/        # Request handlers only
│       │   ├── admin/          # Admin panel endpoints
│       │   └── store/          # Customer storefront endpoints
│       ├── routes/             # Route definitions
│       ├── middlewares/        # Auth, roles, upload, validation
│       ├── validators/         # Zod schemas
│       ├── utils/              # Helpers, ApiError, ApiResponse
│       └── seeds/              # Super admin & default data
│
└── frontend/                   # React + Vite + Tailwind CSS
    └── src/
        ├── api/                # API client
        ├── components/         # Reusable UI
        ├── pages/              # Route pages
        │   ├── admin/          # Admin panel
        │   └── store/          # Customer portal
        ├── hooks/              # Custom React hooks
        ├── context/            # Auth & cart state
        └── layouts/            # Admin & store layouts
```

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secrets, Cloudinary keys, payment keys

npm install
npm run seed    # Creates super admin + default settings
npm run dev     # http://localhost:5000
```

**Default Super Admin:**
- Email: `admin@koselixpress.com`
- Password: `ChangeMe@123`

### Frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```

## API Endpoints

| Group | Base Path | Description |
|-------|-----------|-------------|
| Auth | `/api/v1/auth` | Register, login, profile |
| Store | `/api/v1/store` | Products, checkout, guest orders |
| Admin | `/api/v1/admin` | Full admin panel CRUD |

## Features

- **Admin Panel**: Products, inventory, bulk pricing, orders, users, staff, CMS, blog, navbar, settings
- **Customer Portal**: Guest checkout, login, order history, order tracking
- **Payments**: Khalti, eSewa, Fonepay, Mastercard/Visa (Stripe), COD
- **Delivery**: Nepal-wide delivery zones with configurable fees
- **Media**: Cloudinary upload + external URL support from admin
- **CMS**: Block-based page builder for fully customizable frontend

## Architecture Principles

- **One file, one responsibility** — models, services, controllers, routes are separate
- **Service layer** — all business logic lives in services, controllers only handle HTTP
- **Role-based access** — super_admin, admin, staff (with permissions), customer
- **Validation** — Zod schemas at route level via middleware
