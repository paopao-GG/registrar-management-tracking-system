# RTAMS — Local Development Setup Guide

> **Registrar Task Accomplishment Monitoring System**
> Full-stack web application built with React + Fastify + PostgreSQL

This guide walks you through setting up the RTAMS project on a brand-new device from scratch.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install Required Software](#2-install-required-software)
3. [Clone the Repository](#3-clone-the-repository)
4. [Set Up PostgreSQL Database](#4-set-up-postgresql-database)
5. [Configure Environment Variables](#5-configure-environment-variables)
6. [Install Dependencies](#6-install-dependencies)
7. [Generate Prisma Client & Run Migrations](#7-generate-prisma-client--run-migrations)
8. [Seed the Database](#8-seed-the-database)
9. [Run the Application](#9-run-the-application)
10. [Verify Everything Works](#10-verify-everything-works)
11. [Project Structure Overview](#11-project-structure-overview)
12. [Default Login Credentials](#12-default-login-credentials)
13. [Common Issues & Troubleshooting](#13-common-issues--troubleshooting)

---

## 1. Prerequisites

Before starting, make sure your device meets these requirements:

| Requirement    | Minimum Version | Recommended      |
| -------------- | --------------- | ---------------- |
| **Node.js**    | 18.x            | 20.x or later    |
| **npm**        | 9.x             | 10.x (ships with Node 20+) |
| **PostgreSQL** | 14.x            | 16.x or later    |
| **Git**        | 2.x             | Latest            |

---

## 2. Install Required Software

### A. Install Node.js & npm

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (20.x or later recommended)
3. Run the installer — npm is included automatically
4. Verify installation by opening a terminal:

```bash
node --version
# Expected: v20.x.x or higher

npm --version
# Expected: 10.x.x or higher
```

### B. Install PostgreSQL

#### Option 1: Native Install (Recommended for Windows)

1. Go to [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Download the installer from EDB (EnterpriseDB)
3. Run the installer with these settings:
   - **Port**: `5432` (default)
   - **Superuser password**: Set a password you'll remember (e.g., `postgres`)
   - **Locale**: Default
4. Make sure to check **pgAdmin 4** during installation (optional but helpful)
5. Verify PostgreSQL is running:

```bash
psql --version
# Expected: psql (PostgreSQL) 16.x or similar
```

> **Note**: If `psql` is not recognized, add PostgreSQL's `bin` directory to your system PATH.
> Typical path: `C:\Program Files\PostgreSQL\16\bin`

#### Option 2: Using Docker (Alternative)

If you prefer Docker:

```bash
docker run --name rtams-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=rtams \
  -p 5432:5432 \
  -d postgres:16
```

### C. Install Git

1. Go to [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. Download and install for your OS
3. Verify:

```bash
git --version
```

---

## 3. Clone the Repository

```bash
# Navigate to where you want to store the project
cd ~/Desktop

# Clone the repository
git clone <REPOSITORY_URL> thesis
# Replace <REPOSITORY_URL> with the actual Git remote URL

# Enter the project directory
cd thesis
```

If you already have the project files (e.g., from a USB drive or zip file), just copy them to your desired location and open a terminal there.

---

## 4. Set Up PostgreSQL Database

You need to create a database named `rtams` in PostgreSQL.

### Using psql (Command Line)

```bash
# Connect to PostgreSQL as the default superuser
psql -U postgres

# You'll be prompted for the password you set during installation
```

Once inside the `psql` shell:

```sql
-- Create the database
CREATE DATABASE rtams;

-- Verify it was created
\l

-- Exit psql
\q
```

### Using pgAdmin (GUI)

1. Open **pgAdmin 4**
2. Connect to your local PostgreSQL server
3. Right-click on **Databases** → **Create** → **Database...**
4. Set the database name to `rtams`
5. Click **Save**

---

## 5. Configure Environment Variables

The server reads configuration from a `.env` file located in the `rtams/` directory.

```bash
# Navigate to the rtams workspace root
cd rtams

# Copy the example environment file
cp .env.example .env
```

Now open the `.env` file in a text editor and update the values:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/rtams
JWT_SECRET=your-secret-key-change-in-production
PORT=3001
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**Important**: Replace `YOUR_PASSWORD` with the actual PostgreSQL password you set during installation.

### Environment Variables Explained

| Variable       | Description                              | Default Value                |
| -------------- | ---------------------------------------- | ---------------------------- |
| `DATABASE_URL` | PostgreSQL connection string             | `postgresql://postgres:postgres@localhost:5432/rtams` |
| `JWT_SECRET`   | Secret key for signing JWT tokens        | `dev-secret-change-me`       |
| `PORT`         | Port the backend API server runs on      | `3001`                       |
| `CORS_ORIGIN`  | Allowed frontend origin for CORS         | `http://localhost:5173`      |
| `NODE_ENV`     | Environment mode (`development`/`production`) | `development`           |

> **Note**: The client (Vite dev server) runs on port **5173** by default and proxies API requests to port **3001** automatically via the Vite config. You do not need a separate `.env` file for the client in development.

---

## 6. Install Dependencies

From the `rtams/` directory (the workspace root):

```bash
# Install all dependencies for all workspaces (shared, server, client)
npm install
```

This single command installs dependencies for:
- `@rtams/shared` — Shared TypeScript types and Zod validation schemas
- `@rtams/server` — Fastify backend API
- `@rtams/client` — React frontend (Vite)

The project uses **npm workspaces**, so all three packages are managed from the root.

---

## 7. Generate Prisma Client & Run Migrations

Prisma is the ORM used for database access. You need to generate the Prisma client and apply migrations to create the database tables.

```bash
# Navigate to the server workspace
cd server

# Generate the Prisma client
npx prisma generate

# Run database migrations to create all tables
npx prisma migrate deploy

# Go back to the workspace root
cd ..
```

### What this does:
- **`prisma generate`** — Creates the TypeScript client library from the Prisma schema so the server code can interact with the database
- **`prisma migrate deploy`** — Applies all migration files to your PostgreSQL database, creating the `User`, `Student`, `Transaction`, and `AuditLog` tables along with their indexes and relationships

### Verify tables were created

```bash
cd server
npx prisma studio
```

This opens **Prisma Studio** in your browser (usually at `http://localhost:5555`), where you can visually inspect your database tables. You should see four empty tables: `User`, `Student`, `Transaction`, `AuditLog`. Press `Ctrl+C` to close Prisma Studio when done.

```bash
cd ..
```

---

## 8. Seed the Database

Seeding populates the database with initial data (admin account, sample staff accounts, and sample students).

```bash
# From the rtams/ root directory
npm run seed
```

You should see output like:

```
Connected to PostgreSQL
Admin ready: admin / admin123
Staff ready: staff1 / staff123
Staff ready: staff2 / staff123
Created 8 sample students
Seed complete
```

---

## 9. Run the Application

You need to run **two processes** — the backend server and the frontend dev server. Open **two separate terminal windows/tabs**.

### Build Shared Types First

Before running the dev servers for the first time, build the shared package:

```bash
# From rtams/ root
npm run build -w shared
```

### Terminal 1 — Start the Backend Server

```bash
# From rtams/ root
npm run dev:server
```

You should see:

```
Server listening at http://0.0.0.0:3001
```

### Terminal 2 — Start the Frontend Dev Server

```bash
# From rtams/ root
npm run dev:client
```

You should see:

```
  VITE v8.x.x  ready in XXXms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://xxx.xxx.xxx.xxx:5173/
```

### Open the Application

Open your browser and go to:

```
http://localhost:5173
```

You should see the RTAMS login page.

---

## 10. Verify Everything Works

1. **Login as Admin**: Use `admin` / `admin123`
2. **Check the Dashboard**: You should see the admin dashboard with navigation options
3. **View Students**: Navigate to the students section — you should see the 8 seeded students
4. **Create a Transaction**: Try creating a new document request to verify the full stack works
5. **Login as Staff**: Log out and try `staff1` / `staff123` to verify staff access

---

## 11. Project Structure Overview

```
rtams/
├── package.json            # Workspace root — defines workspaces and root scripts
├── tsconfig.base.json      # Shared TypeScript compiler settings
├── .env                    # Environment variables (you created this)
├── .env.example            # Template for environment variables
│
├── shared/                 # @rtams/shared — Shared types & validation
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts        # Re-exports all shared types/schemas
│       ├── types/          # TypeScript type definitions
│       ├── validation.ts   # Zod validation schemas
│       └── constants.ts    # Shared constants (courses, doc types, etc.)
│
├── server/                 # @rtams/server — Fastify API backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema definition
│   │   └── migrations/     # SQL migration files
│   └── src/
│       ├── index.ts        # Server entry point (Fastify setup)
│       ├── seed.ts         # Database seeder
│       ├── config/         # Environment & database config
│       ├── middleware/      # Auth & role-based access middleware
│       ├── routes/         # API route handlers
│       ├── services/       # Business logic layer
│       └── utils/          # Helpers (JWT, passwords, CSV, etc.)
│
└── client/                 # @rtams/client — React frontend
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts      # Vite config (proxy, aliases)
    ├── tailwind.config.js  # Tailwind CSS theme
    ├── index.html          # HTML entry point
    └── src/
        ├── main.tsx        # React DOM entry point
        ├── App.tsx         # Root component with routing
        ├── index.css       # Global styles (Tailwind)
        ├── components/     # Reusable UI components
        ├── pages/          # Page-level components
        ├── hooks/          # Custom React hooks
        └── lib/            # API client, auth context, utilities
```

### Tech Stack Summary

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 19, Vite, Tailwind CSS, Radix UI, TanStack Query |
| Backend    | Fastify 4, Prisma ORM, Zod validation           |
| Database   | PostgreSQL                                       |
| Auth       | JWT (JSON Web Tokens) + bcrypt password hashing  |
| Language   | TypeScript (across all packages)                 |
| Monorepo   | npm workspaces                                   |

---

## 12. Default Login Credentials

| Role  | Username | Password   |
| ----- | -------- | ---------- |
| Admin | `admin`  | `admin123` |
| Staff | `staff1` | `staff123` |
| Staff | `staff2` | `staff123` |

> These are created by the seed script. Change passwords after initial setup if deploying beyond local development.

---

## 13. Common Issues & Troubleshooting

### `psql: command not found`

PostgreSQL's `bin` directory is not in your system PATH.

- **Windows**: Add `C:\Program Files\PostgreSQL\16\bin` to your system PATH environment variable
- **macOS (Homebrew)**: Run `brew link postgresql`

### `ECONNREFUSED 127.0.0.1:5432`

PostgreSQL is not running.

- **Windows**: Open **Services** (`services.msc`) and start the `postgresql-x64-16` service
- **macOS**: Run `brew services start postgresql`
- **Docker**: Run `docker start rtams-postgres`

### `database "rtams" does not exist`

You haven't created the database yet. Go back to [Step 4](#4-set-up-postgresql-database).

### `P1001: Can't reach database server`

Check your `DATABASE_URL` in `.env`:
- Is the password correct?
- Is PostgreSQL running on port 5432?
- Did you create the `rtams` database?

### `Cannot find module '@rtams/shared'`

The shared package hasn't been built yet. Run:

```bash
npm run build -w shared
```

### `npx prisma: command not found` or Prisma errors

Prisma may not be installed. Run:

```bash
cd server
npx prisma generate
```

If that fails, try:

```bash
npm install
```

### Port already in use (3001 or 5173)

Another process is using the port. Find and kill it:

```bash
# Find process on port 3001
# Windows (PowerShell):
netstat -ano | findstr :3001

# macOS/Linux:
lsof -i :3001

# Then kill the process by PID
```

Or change the port in `.env` (for the server) or in `vite.config.ts` (for the client).

### `bcrypt` build errors on Windows

`bcrypt` requires native build tools. Install them:

```bash
npm install --global windows-build-tools
```

Or install the **"Desktop development with C++"** workload via Visual Studio Build Tools.

### Migrations fail or schema is out of date

Reset the database and re-run migrations:

```bash
cd server
npx prisma migrate reset
cd ..
```

> **Warning**: This deletes all data in the database. You'll need to re-run `npm run seed` afterward.

---

## Quick Start (TL;DR)

For experienced developers, here's the condensed version:

```bash
# 1. Ensure Node.js 20+ and PostgreSQL 16+ are installed and running

# 2. Create the database
psql -U postgres -c "CREATE DATABASE rtams;"

# 3. Enter the workspace root
cd rtams

# 4. Create your .env file
cp .env.example .env
# Edit .env — set your DATABASE_URL password

# 5. Install dependencies
npm install

# 6. Build shared types
npm run build -w shared

# 7. Generate Prisma client & run migrations
cd server && npx prisma generate && npx prisma migrate deploy && cd ..

# 8. Seed the database
npm run seed

# 9. Start the app (two terminals)
npm run dev:server   # Terminal 1 → API on :3001
npm run dev:client   # Terminal 2 → UI on :5173

# 10. Open http://localhost:5173 and login with admin / admin123
```
