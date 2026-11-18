# TxgEvent Production Registration & Authentication Fix — Implementation Walkthrough

**Document Version:** 1.0  
**Target Environment:** `https://tecnolynx.com` (Subpath: `/txgevent`)  
**Components:** Next.js 16 (Port `3005`) + Django 6 REST Framework (Port `8005`) + Nginx Reverse Proxy  
**Author:** DevOps & Senior Full-Stack Engineering Team

---

## 1. Executive Summary

### What Was Broken?
When new users tried to register on the website at `https://tecnolynx.com/txgevent/register`, the registration failed immediately with an error message:
> `Registration Failed: RuntimeError at /api/auth/register`  
> `You called this URL via POST, but the URL doesn't end in a slash and you have APPEND_SLASH set...`

Even if an account was saved in the database, the user was never logged in and was kicked back to the login screen whenever they tried to view their profile.

### What Was the Actual Root Cause?
The application lives in a subfolder on the server called `/txgevent`. However, the frontend registration code was asking the browser to send data to `/api/auth/register` (at the root of the domain, dropping the `/txgevent` folder name). 

Because `/txgevent` was missing from the URL:
1. The web server (Nginx) sent the request straight to **Django** instead of sending it to **Next.js**.
2. Django rejected the request because it was missing a trailing slash (`/register/`).
3. More importantly, **Next.js is the only part of the system that creates secure login cookies**. Because the request bypassed Next.js, the user never received their session cookies.

### What Was Changed?
The fix required coordinated changes across two main areas:
1. **Frontend Code (Next.js):** Configured Next.js with `basePath: '/txgevent'` and updated the API fetch client so that all browser network requests stay inside the `/txgevent` application path.
2. **Web Server Configuration (Nginx):** Prepared a dedicated Nginx configuration that routes all `/txgevent` requests to Next.js on port `3005` without stripping paths, keeping it completely separated from any other websites on `tecnolynx.com`.
3. **Backend Security (Django):** Verified that `DEBUG=False` runs cleanly and documented setting `DJANGO_DEBUG=False` on the live server to prevent exposing system internals.

---

## 2. Original Problem & Broken Flow

### The Broken Request Flow Diagram

```text
[User Browser on https://tecnolynx.com/txgevent/register]
       │
       │ 1. Submits form -> bffFetch('/api/auth/register')
       │ 2. Browser resolves root-relative path to:
       ▼    POST https://tecnolynx.com/api/auth/register (DROPS /txgevent)
[Nginx Reverse Proxy on tecnolynx.com]
       │
       │ 3. URL does NOT start with /txgevent/
       │    Matches root /api/ rule -> forwards to Django Gunicorn:8005
       ▼ ❌ BYPASSES Next.js container (Port 3005)
[Django REST Framework on 127.0.0.1:8005]
       │
       │ 4. Receives: POST /api/auth/register (NO trailing slash)
       │ 5. Django URLconf requires: 'api/auth/register/'
       │ 6. CommonMiddleware cannot redirect POST without corrupting body
       ▼
[Crash: RuntimeError]
       │ 7. Django outputs yellow debug error HTML (DEBUG=True)
       ▼
[Browser: Form displays "Registration Failed"]
       • User created in Postgres DB (if transaction committed)
       • NO httpOnly access_token cookie was ever created
       • NO session_active cookie was ever created
       • Protected page /profile immediately redirects to /login
```

---

## 3. Corrected Architecture & Intended Flow

### The Corrected Request Flow Diagram

```text
[User Browser on https://tecnolynx.com/txgevent/register]
       │
       │ 1. Submits form -> bffFetch('/api/auth/register')
       │ 2. bff-client automatically prepends basePath:
       ▼    POST https://tecnolynx.com/txgevent/api/auth/register
[Nginx Reverse Proxy on tecnolynx.com]
       │
       │ 3. Matches: location /txgevent
       │ 4. Proxies full path to Next.js (Port 3005)
       ▼
[Next.js App Router (BFF Layer) on 127.0.0.1:3005]
       │
       │ 5. Route Handler (src/app/api/auth/register/route.ts) executes
       │ 6. Validates payload and calls Django over private server loopback:
       ▼    POST http://127.0.0.1:8005/api/auth/register/ (WITH trailing slash)
[Django REST Framework on 127.0.0.1:8005]
       │
       │ 7. Matches 'api/auth/register/' cleanly
       │ 8. Creates user in DB, generates SimpleJWT tokens
       ▼ 9. Returns JSON: { user: {...}, tokens: { access: '...', refresh: '...' } }
[Next.js App Router (BFF Layer)]
       │
       │ 10. Receives JWT tokens from Django
       │ 11. Sets secure HttpOnly cookies: 'access_token', 'refresh_token', 'session_active'
       ▼ 12. Returns HTTP 201 Created to browser with Set-Cookie headers
[User Browser]
       │
       │ 13. Stores secure HttpOnly cookies automatically
       │ 14. router.push('/profile') navigates to https://tecnolynx.com/txgevent/profile
       ▼
[Protected Profile Page]
       │ 15. Next.js middleware verifies 'session_active' / 'access_token' cookie
       └─► Access GRANTED! User profile renders smoothly.
```

### Component Responsibilities in Plain English
* **Nginx:** The gatekeeper. It listens on the internet (`tecnolynx.com`). When someone asks for anything starting with `/txgevent`, it forwards the traffic to Next.js on port `3005`.
* **Next.js (BFF Layer):** The user's direct companion. It delivers the HTML/CSS web pages, handles authentication clicks, holds the secure login cookies, and talks privately to Django.
* **Django:** The secure database vault. It validates user data, writes records to PostgreSQL, issues JWT tokens, and never exposes private authentication endpoints directly to the open internet.

---

## 4. Files Changed

| File | What was changed | Why it was changed | Risk |
| :--- | :--- | :--- | :--- |
| `frontend/next.config.ts` | Added `basePath: basePath \|\| undefined` driven by `process.env.NEXT_PUBLIC_BASE_PATH \|\| '/txgevent'`. | Instructs Next.js to mount all pages, chunks, route handlers, and links under the `/txgevent` subpath. | Low. Standard Next.js configuration for subpath hosting. |
| `frontend/src/lib/api/bff-client.ts` | Added `resolveBffUrl` helper to automatically prepend `basePath` to origin-relative endpoints. | Browser `fetch()` does not automatically prefix subpaths; this guarantees all client API calls hit `/txgevent/api/...`. | Low. Pure utility function that safely preserves external and already-prefixed URLs. |
| `frontend/src/proxy.ts` | Changed redirects from `new URL('/login', request.url)` to `request.nextUrl.clone()`. | Native `new URL('/login', ...)` stripped `/txgevent` and redirected to `tecnolynx.com/login` (404). Cloning `nextUrl` retains `basePath`. | Low. Official Next.js recommended practice for middleware redirects. |
| `nginx/txgevent.tecnolynx.com.conf` | Created complete production Nginx virtual host block for `/txgevent`. | Provides the exact server block for VPS deployment to ensure all `/txgevent` traffic routes cleanly to Next.js. | Zero to repo (standalone deployment configuration file). |

---

## 5. Before and After Changes

### A. Next.js Configuration (`frontend/next.config.ts`)

#### Before:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

#### After:
```typescript
import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH !== undefined
  ? process.env.NEXT_PUBLIC_BASE_PATH
  : '/txgevent';

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```
* **Why it is necessary:** Without `basePath`, Next.js assumes it is at the root domain (`/`). It generates static chunk links at `/_next/...` and internal routes at `/login`, which break when mounted at `/txgevent`.
* **What would happen if not changed:** Browsing `/txgevent` would either 404 or fail to load assets and sub-routes.

---

### B. BFF Fetch Helper (`frontend/src/lib/api/bff-client.ts`)

#### Before:
```typescript
export async function bffFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<BffResponse<T>> {
  const { headers: customHeaders, ...restOptions } = options;
  ...
  try {
    const response = await fetch(endpoint, {
      ...restOptions,
      headers,
      credentials: 'same-origin',
    });
```

#### After:
```typescript
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH !== undefined
  ? process.env.NEXT_PUBLIC_BASE_PATH
  : '/txgevent';

function resolveBffUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanBase = BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH;
  if (!cleanBase) {
    return endpoint;
  }
  if (endpoint === cleanBase || endpoint.startsWith(`${cleanBase}/`)) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
}

export async function bffFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<BffResponse<T>> {
  const { headers: customHeaders, ...restOptions } = options;
  ...
  const targetUrl = resolveBffUrl(endpoint);

  try {
    const response = await fetch(targetUrl, {
      ...restOptions,
      headers,
      credentials: 'same-origin',
    });
```
* **Why it is necessary:** When JavaScript runs in the browser, calling `fetch('/api/auth/register')` always calls the domain root (`tecnolynx.com/api/...`), completely escaping the subpath. `resolveBffUrl` ensures it becomes `tecnolynx.com/txgevent/api/auth/register`.
* **What would happen if not changed:** All registration and login API calls would continue escaping to Django directly and crashing with `RuntimeError`.

---

### C. Middleware Subpath Redirects (`frontend/src/proxy.ts`)

#### Before:
```typescript
  if (isProtectedPath && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && hasSession) {
    return NextResponse.redirect(new URL('/services', request.url));
  }
```

#### After:
```typescript
  if (isProtectedPath && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && hasSession) {
    const servicesUrl = request.nextUrl.clone();
    servicesUrl.pathname = '/services';
    return NextResponse.redirect(servicesUrl);
  }
```
* **Why it is necessary:** Standard JavaScript `new URL('/login', 'https://tecnolynx.com/txgevent/profile')` produces `https://tecnolynx.com/login` (dropping `/txgevent`). Cloning `request.nextUrl` preserves the Next.js `basePath` metadata, producing `https://tecnolynx.com/txgevent/login`.
* **What would happen if not changed:** When an unauthenticated user tried to visit `/profile`, they would be redirected to `tecnolynx.com/login` instead of `tecnolynx.com/txgevent/login`, resulting in a 404 page.

---

## 6. Registration Request Walkthrough (Step-by-Step)

1. **User Action:** The visitor fills in their name, email, and password on `https://tecnolynx.com/txgevent/register` and clicks **"Create Account"**.
2. **Form Handler:** [B2CRegisterForm.tsx](file:///c:/Users/chris/OneDrive/Desktop/event/frontend/src/features/authentication/forms/B2CRegisterForm.tsx#L44-L47) executes `onSubmit(data)` and passes the form data to `authClientService.registerB2C(data)`.
3. **Client Call:** `authClientService` calls `bffFetch('/api/auth/register', { method: 'POST', body: ... })`.
4. **Subpath Resolution:** `bff-client.ts` calls `resolveBffUrl('/api/auth/register')`, converting the URL to `/txgevent/api/auth/register`.
5. **Nginx Routing:** The browser transmits `POST https://tecnolynx.com/txgevent/api/auth/register`. Nginx matches `location /txgevent` and proxies the request to Next.js on port `3005`.
6. **Next.js Route Handler:** Next.js receives the request at [src/app/api/auth/register/route.ts](file:///c:/Users/chris/OneDrive/Desktop/event/frontend/src/app/api/auth/register/route.ts#L6).
7. **Internal Django Query:** The Next.js server makes an internal HTTP call:
   `POST http://127.0.0.1:8005/api/auth/register/` (Notice the trailing slash!).
8. **Django Processing:** Django validates the user, saves the user to PostgreSQL, and issues SimpleJWT access and refresh tokens.
9. **Django Response:** Django returns HTTP 201 with `{ user: {...}, tokens: { access: '...', refresh: '...' } }` back to Next.js over the private loopback.
10. **Cookie Issuance:** Next.js calls `setAuthCookies(response, tokens)`. It attaches the secure cookies to the HTTP response and returns `{ user: {...}, message: "Account created successfully" }` to the browser.
11. **Client Storage:** The user's browser automatically saves the `access_token`, `refresh_token`, and `session_active` cookies.
12. **Redirection:** The form code executes `router.push('/profile')`.
13. **Middleware Check:** Next.js middleware reads the `access_token` cookie, confirms the user is authenticated, and renders the user's profile dashboard!

---

## 7. Cookie & Session Walkthrough

* **Where does the JWT token go?**  
  Django sends raw JWT tokens to Next.js over the private server connection. The browser JavaScript **never** sees or stores the raw JWT tokens in `localStorage` or `sessionStorage`. This completely blocks Cross-Site Scripting (XSS) token theft.
* **How are cookies created?**  
  In [frontend/src/lib/auth/cookies.ts](file:///c:/Users/chris/OneDrive/Desktop/event/frontend/src/lib/auth/cookies.ts#L33-L53), Next.js attaches the following headers to the response:
  * `Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=518400`
  * `Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
  * `Set-Cookie: session_active=1; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
* **Why `HttpOnly`?**  
  `HttpOnly` tells the browser that malicious JavaScript running on the page is forbidden from reading the cookie.
* **Why `Secure`?**  
  `Secure` tells the browser that the cookie can only be sent over encrypted HTTPS connections (`https://tecnolynx.com`).
* **Why `SameSite=Lax`?**  
  Protects against Cross-Site Request Forgery (CSRF) by preventing external malicious websites from sending your authentication cookie.
* **How Token Refresh Works:**  
  When an access token expires, [src/app/api/auth/refresh/route.ts](file:///c:/Users/chris/OneDrive/Desktop/event/frontend/src/app/api/auth/refresh/route.ts) reads the `refresh_token` cookie, calls Django's `api/auth/token/refresh/`, and updates both cookies automatically in the background.
* **How Logout Works:**  
  When the user logs out, [src/app/api/auth/logout/route.ts](file:///c:/Users/chris/OneDrive/Desktop/event/frontend/src/app/api/auth/logout/route.ts) notifies Django to blacklist the refresh token and sets `Max-Age=0` on all cookies, wiping them from the browser immediately.

---

## 8. Nginx Explanation

### The Updated Nginx Configuration
Located in the repository at [nginx/txgevent.tecnolynx.com.conf](file:///c:/Users/chris/OneDrive/Desktop/event/nginx/txgevent.tecnolynx.com.conf):

```nginx
location /txgevent {
    proxy_pass http://127.0.0.1:3005;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

location /txgevent/backend/ {
    rewrite ^/txgevent/backend/(.*)$ /$1 break;
    proxy_pass http://127.0.0.1:8005;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_redirect / /txgevent/backend/;
    client_max_body_size 25M;
}
```

### Why This Configuration Is Safe
1. **No Trailing Slash on `proxy_pass http://127.0.0.1:3005;`:**  
   Because Next.js has `basePath: '/txgevent'`, Next.js expects the incoming request to be `/txgevent/...`. By omitting the trailing slash in Nginx, Nginx passes the URI intact.
2. **Isolation from Other Websites:**  
   Because all frontend pages, chunks (`/txgevent/_next/static/...`), and API route handlers (`/txgevent/api/auth/...`) live strictly under `/txgevent`, Nginx does not need any rules at the domain root (`/api/` or `/_next/`). Any other website or application on `tecnolynx.com` remains 100% unaffected.

---

## 9. Testing Results

| Test Description | Status | Evidence / Command Executed | Notes |
| :--- | :---: | :--- | :--- |
| **TypeScript Validation** | **PASS** | `cd frontend; npx tsc --noEmit` exited with code 0. | Zero type errors across all routes, schemas, and services. |
| **Frontend Production Build** | **PASS** | `cd frontend; npm run build` exited with code 0. | All 29 routes (pages + route handlers) compiled and prerendered successfully with `basePath: '/txgevent'`. |
| **BFF Client URL Resolution** | **PASS** | Tested `resolveBffUrl('/api/auth/register')` $\rightarrow$ `'/txgevent/api/auth/register'`. | Verified subpath prefixing preserves absolute and external URLs. |
| **Middleware Redirect Cloning** | **PASS** | Evaluated `request.nextUrl.clone()` with `basePath`. | Eliminates subpath stripping bug present in `new URL('/login', ...)`. |
| **Django System Check (DEBUG=False)** | **PASS** | `python manage.py check` with `DJANGO_DEBUG=False` $\rightarrow$ `System check identified no issues (0 silenced)`. | Backend runs cleanly without warnings in production mode. |
| **Django Registration URL Pattern** | **PASS** | `reverse('auth_register')` $\rightarrow$ `/api/auth/register/`. | Verified exact pattern includes required trailing slash. |
| **Live VPS Nginx Reload** | **NOT TESTED** | Requires SSH access to production server. | Step-by-step instructions provided in Section 10. |
| **Live Registration on tecnolynx.com** | **NOT TESTED** | Requires deploying the approved changes to the production VPS. | Step-by-step verification checklist provided below. |

---

## 10. Deployment Instructions (Beginner-Friendly)

Follow these steps in order when applying the fix on your production VPS:

### Step 1: Backup Your Current Server Configuration
Log into your VPS via SSH and create a backup of your current Nginx configuration:
```bash
sudo cp /etc/nginx/sites-available/tecnolynx.com.conf /etc/nginx/sites-available/tecnolynx.com.conf.backup.$(date +%F)
```

### Step 2: Update Django Environment on the VPS
Open your backend `.env` file:
```bash
nano /var/www/txgevent/backend/.env
```
Ensure the following variables are set:
```env
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,tecnolynx.com
CSRF_TRUSTED_ORIGINS=https://tecnolynx.com
```
Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

### Step 3: Deploy Frontend Code
Pull the updated code and rebuild the frontend container or service:
```bash
cd /var/www/txgevent
git pull origin main

cd frontend
npm install --frozen-lockfile
npm run build

# Restart your frontend PM2 process or systemd service:
pm2 restart txgevent-frontend   # (or: sudo systemctl restart txgevent-frontend)
```

### Step 4: Update Nginx Configuration
Edit your Nginx configuration on the VPS:
```bash
sudo nano /etc/nginx/sites-available/tecnolynx.com.conf
```
Update the `/txgevent` location block to match [nginx/txgevent.tecnolynx.com.conf](file:///c:/Users/chris/OneDrive/Desktop/event/nginx/txgevent.tecnolynx.com.conf):
```nginx
location /txgevent {
    proxy_pass http://127.0.0.1:3005;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

### Step 5: Test and Reload Nginx
**Never reload Nginx without testing first!**
```bash
# 1. Test configuration syntax
sudo nginx -t

# 2. If it prints "syntax is okay", reload:
sudo systemctl reload nginx
```

### Step 6: Verify in Browser
1. Open Google Chrome in Incognito / Private mode.
2. Navigate to `https://tecnolynx.com/txgevent/register`.
3. Open Developer Tools (`F12`), click the **Network** tab.
4. Fill out the registration form and click **Submit**.
5. Observe the network request:
   * Target URL: `https://tecnolynx.com/txgevent/api/auth/register` (Status: `201 Created`).
   * Response Headers: Check that `Set-Cookie` headers are present for `access_token` and `session_active`.
   * Navigation: Check that you are automatically redirected to `https://tecnolynx.com/txgevent/profile` and that your profile loads successfully!

---

## 11. Rollback Instructions

If you need to revert the changes quickly:

```bash
# 1. Restore the previous Nginx configuration
sudo cp /etc/nginx/sites-available/tecnolynx.com.conf.backup.<date> /etc/nginx/sites-available/tecnolynx.com.conf
sudo nginx -t && sudo systemctl reload nginx

# 2. Revert frontend changes
cd /var/www/txgevent/frontend
git checkout HEAD~1 -- next.config.ts src/lib/api/bff-client.ts src/proxy.ts
npm run build
pm2 restart txgevent-frontend

# 3. Verify site is back to previous state
curl -I https://tecnolynx.com/txgevent
```

---

## 12. Remaining Work & Production Prerequisites

The following steps cannot be performed from the local repository and require your action on the production VPS:
1. **VPS SSH Access:** Logging into the server to pull the code changes.
2. **Nginx File Inspection:** Confirming the location of your Nginx file on the VPS (`/etc/nginx/sites-available/...`).
3. **Environment Update:** Adding `DJANGO_DEBUG=False` to `/var/www/txgevent/backend/.env`.
4. **Service Reload:** Running `sudo nginx -t && sudo systemctl reload nginx`.
