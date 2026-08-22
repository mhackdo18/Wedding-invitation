# Wedding Platform — Self-Hosted

A premium digital wedding invitation and event management platform. Create beautiful, animated invitations, manage guests, track RSVPs, build seating charts, and publish a multi-page wedding website — all from one admin panel.

---

## Features

- Interactive animated envelope invitation with wax seal
- Multi-layout Welcome page (8 design templates)
- Bridal Entourage builder with per-section typography
- Schedule / Order of Events with timeline
- Gallery with masonry grid
- RSVP wizard with conditional questions, proxy support, and terms
- Seating chart / Find Your Table
- Venue pages with map integration
- Guest list with party groups, tags, bulk import (CSV)
- Email invitation designer with attachments
- Coordinator portal for check-in at the event
- Password-protected public site
- Admin panel secured by email/password login

---

## Requirements

| Component | Minimum Version |
|-----------|----------------|
| Node.js | 18+ |
| npm | 9+ |
| Supabase project | Free tier or higher |

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-username/wedding-platform.git
cd wedding-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Settings > API** in your Supabase dashboard and copy:
   - `Project URL`
   - `anon public` key

3. Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run database migrations

Apply the SQL migrations in `supabase/migrations/` to your Supabase project. You can do this via the Supabase SQL Editor in your dashboard:

1. Open **SQL Editor** in your Supabase dashboard.
2. Run each `.sql` file in `supabase/migrations/` folder **in order** (sorted by filename).
3. The migrations will create all required tables, indexes, RLS policies, and storage buckets.

**Alternatively**, if you have the Supabase CLI configured locally:

```bash
npx supabase db push
```

### 5. Create your admin account

The first time you visit the admin panel, you will see a login screen. Click "Create an account" to register your admin user with email and password.

### 6. Start the development server

```bash
npm run dev
```

Visit:
- **Public site**: `http://localhost:5173`
- **Admin panel**: `http://localhost:5173/#/admin`
- **Coordinator portal**: `http://localhost:5173/#/coordinator`

---

## Build for production

```bash
npm run build
```

Static files are output to `dist/`. Deploy to any static host (Vercel, Netlify, Cloudflare Pages, etc.).

---

## Database Schema

The platform uses the following Supabase tables:

| Table | Purpose |
|-------|---------|
| `site_settings` | Global site configuration, styling, envelope/invitation design |
| `pages` | Multi-page builder (welcome, story, gallery, schedule, entourage, etc.) |
| `events` | Wedding events and sub-events with times and venue links |
| `venues` | Venue locations with photos and Google Maps URLs |
| `guests` | Guest list with RSVP status, parties, tags, dietary notes |
| `parties` | Party/table groupings for guests |
| `rsvp_questions` | Custom RSVP form questions with conditional logic |
| `guest_event_rsvps` | Per-guest per-event RSVP responses |
| `gallery_photos` | Photo gallery with captions and ordering |
| `seating_tables` | Seating chart tables with assigned guests |
| `invitations` | Invitation tracking (sent status, opened, etc.) |
| `collaborators` | Team members with role-based access |
| `entourage_members` | Legacy entourage list (config now stored in pages.config) |

### Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `wedding-images` | Hero photos, gallery, venue photos |
| `monogram` | Wax seal monograms and footer monograms |
| `documents` | Email attachments and downloadable files |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public API key |

---

## Authentication

The admin panel uses Supabase Auth with email/password. On first visit:

1. Navigate to `/#/admin`
2. Click "Create an account"
3. Enter your email and a password (min 6 characters)
4. You will be logged in immediately

The public wedding site does NOT require authentication. Optionally, you can enable a password gate (set in admin Settings) that requires guests to enter a simple shared password to view the site.

---

## Project Structure

```
src/
├── admin/               Admin panel components
│   ├── AdminApp.tsx     Main admin layout and navigation
│   ├── AdminAuth.tsx    Login/register gate
│   ├── sections/        Admin feature panels
│   └── ui.tsx           Shared admin UI primitives
├── components/public/   Public-facing components
├── lib/                 Utilities (supabase client, router, fonts, etc.)
├── pages/               Page-level components (PublicSite, RsvpPage, etc.)
└── types.ts             TypeScript interfaces
```

---

## License

MIT
