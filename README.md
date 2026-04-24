# D.I.Y (Do It Yourself)

AI-first repair platform with a secondary community feed, built with React + Vite + Tailwind CSS.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in project root and add:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_ADMIN_PASSWORD=choose_a_strong_admin_password
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SITE_URL=https://diy-horizons.example.com
```

3. Run the app:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Main Routes

- `/` AI assistant (primary)
- `/signin` dedicated sign-in page (email/password + Google + Apple)
- `/account` account management panel
- `/u/:handle` public user profile page
- `/community` community feed (secondary)
- `/knowledge` repair playbooks and common fixes
- `/admin` password-protected admin panel
- `/privacy` privacy policy
- `/terms` terms of use

## Authentication (Real Provider)

This project uses Supabase Auth for real sign-in:

- Email/password sign-in and sign-up
- Google OAuth sign-in
- Apple OAuth sign-in
- Forgot-password email flow
- Resend email-verification flow

Supabase dashboard setup checklist:

1. Enable Email provider in Authentication -> Providers.
2. Enable Google provider and set Google OAuth client credentials.
3. Enable Apple provider and configure Apple Sign In credentials.
4. Add redirect URL in Supabase and provider consoles:
	- `http://localhost:5173/auth/callback`
	- `http://localhost:5174/auth/callback` (if Vite changes dev port)
	- production callback URL equivalent.

Note: the UI route `/auth/callback` is used to complete OAuth redirects.

## Social + DM Backend (Supabase)

Community social features now support persisted backend storage with RLS policies.

Core tables added in `db/schema.sql`:

- `profiles`
- `friend_requests`
- `friendships`
- `dm_threads`
- `dm_messages`
- `user_blocks`
- `user_mutes`
- `reports`
- `moderation_queue`
- `community_topics`
- `community_replies`
- `telemetry_events`

These power:

- Search users and send/approve friend requests
- Friend-gated private DMs
- Report/block/mute moderation actions
- Admin moderation queue hydration from backend

Run the SQL in Supabase SQL Editor before using backend-persisted social features.

## Additional Production Features

- Global error boundary with user-safe fallback UI.
- Event telemetry for auth failures, AI request failures, DM/community send failures, and UI crashes.
- Progressive migration to Supabase for community topics/replies with static fallback when tables are not available.
- Windowed list rendering in community for large people/message lists.
- Account sessions/devices panel with current device tracking and revoke controls.

## Launch Checklist

1. Set production env vars in your hosting provider:
	- `VITE_GEMINI_API_KEY`
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`
	- `VITE_ADMIN_PASSWORD`
	- `VITE_SITE_URL`
2. Run `db/schema.sql` in Supabase SQL Editor.
3. In Supabase Auth settings, add production callback URL:
	- `https://your-domain.com/auth/callback`
4. Replace placeholder domain references in:
	- `public/robots.txt`
	- `public/sitemap.xml`
	- `public/.well-known/security.txt`
	- `index.html` canonical/OG URL tags
5. Build and verify:
	- `npm run build`
	- `npm run preview`
6. Deploy `dist/` or connect project directly on Vercel.

## Deployment Notes

- `vercel.json` is included with SPA rewrites and baseline security headers.
- `public/manifest.webmanifest`, `public/robots.txt`, and `public/sitemap.xml` are included for launch indexing support.

## Admin Password Security

- Admin session is stored in `sessionStorage`.
- Wrong attempts are tracked; lockout triggers after 5 failed tries.
- Lockout duration is 5 minutes and persists via `localStorage`.

Important: this is client-side protection for UI gating only. Real production security must enforce auth/authorization on a backend.







