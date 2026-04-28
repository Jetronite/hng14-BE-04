# 🧭 PHASE 1 — Stabilize Stage 2 (Baseline Lock)

**Goal:** Freeze a solid foundation before adding auth.

### Tasks:

* Ensure:

  * Filtering ✅
  * Sorting ✅
  * Pagination ✅
  * Natural language search ✅
* Add missing requirements:

  * `X-API-Version` header check
  * New pagination format (`total_pages`, `links`)
* Write tests for:

  * `/api/profiles`
  * `/api/profiles/search`

👉 Output:

* Stable API (no auth yet)
* Test coverage for core endpoints

---

# 🔐 PHASE 2 — User System + DB Design

**Goal:** Introduce identity layer.

### Tasks:

* Create `users` table:

  * UUID v7
  * github_id (unique)
  * role (`analyst` default)
  * is_active
* Add indexes:

  * `github_id`
* Create user service:

  * `findOrCreateUser()`

👉 Output:

* User persistence ready for OAuth

---

# 🔑 PHASE 3 — GitHub OAuth (Web Flow First)

**Goal:** Get authentication working in the simplest environment (browser).

### Tasks:

* Implement:

  * `GET /auth/github`
  * `GET /auth/github/callback`
* Exchange code → GitHub user
* Create/update user
* Issue:

  * access token (3 min)
  * refresh token (5 min)

👉 Keep it simple first:

* No PKCE yet (just working OAuth)

👉 Output:

* Web login works end-to-end

---

# 🔁 PHASE 4 — Token System (Core Security)

**Goal:** Proper session handling.

### Tasks:

* Implement:

  * `POST /auth/refresh`
  * `POST /auth/logout`
* Store refresh tokens (DB or Redis)
* Invalidate old refresh token on use

👉 Add:

* JWT access tokens
* Rotation logic

👉 Output:

* Secure token lifecycle

---

# 🧱 PHASE 5 — Auth Middleware + Route Protection

**Goal:** Lock down your API.

### Tasks:

* Middleware:

  * Verify access token
  * Attach user to request
* Protect:

  * ALL `/api/*` routes

👉 Add:

* `is_active` check → return **403**

👉 Output:

* No anonymous access anymore

---

# 🛡️ PHASE 6 — Role-Based Access Control (RBAC)

**Goal:** Enforce permissions cleanly.

### Tasks:

* Build middleware like:

```js
authorize("admin")
authorize("analyst")
```

### Rules:

* `admin` → full access
* `analyst` → read-only

Apply to:

* `POST /api/profiles` → admin only
* `GET` endpoints → both

👉 Output:

* Centralized, reusable RBAC system

---

# 📦 PHASE 7 — API Enhancements

**Goal:** Meet Stage 3 API requirements.

### Tasks:

* Add:

  * CSV export endpoint
  * API version enforcement
* Update pagination response:

```json
{
  "total_pages": ...,
  "links": { ... }
}
```

👉 Output:

* Fully compliant API spec

---

# ⚡ PHASE 8 — Rate Limiting + Logging

**Goal:** Production readiness.

### Tasks:

* Rate limiting:

  * `/auth/*` → 10/min
  * others → 60/min
* Logging middleware:

  * method
  * endpoint
  * status
  * response time

👉 Output:

* Observability + abuse protection

---

# 💻 PHASE 9 — CLI Tool

**Goal:** Power-user interface.

### Tasks:

* Build CLI:

  * `insighta login` (PKCE flow)
  * `insighta whoami`
  * `insighta profiles list`
  * `search`, `create`, `export`

### Key challenges:

* PKCE implementation
* Local callback server
* Token storage:

  ```
  ~/.insighta/credentials.json
  ```

👉 Output:

* Fully functional CLI client

---

# 🌐 PHASE 10 — Web Portal

**Goal:** Non-technical user interface.

### Tasks:

* Pages:

  * Login (GitHub OAuth)
  * Dashboard
  * Profiles list
  * Search
  * Profile detail
* Auth:

  * HTTP-only cookies
  * CSRF protection

👉 Output:

* Clean UI backed by same API

---

# 🔄 FINAL PHASE — Integration & Consistency Check

**Goal:** Everything works together.

### Verify:

* CLI == Web == API results
* Token expiry handled correctly
* Role enforcement consistent
* No regression from Stage 2

---

# 🧠 Strategy Tips (this is where people fail)

### 1. Don’t start with CLI

CLI + PKCE is the hardest part.

👉 Do Web OAuth first, then extend.

---

### 2. Don’t scatter auth logic

Bad:

```js
if (user.role === 'admin') ...
```

Good:

* Central middleware

---

### 3. Build incrementally

After each phase:

* Test
* Commit
* Lock it

---

### 4. Time allocation (realistic)

| Phase        | Difficulty |
| ------------ | ---------- |
| 1–2          | Easy       |
| 3–4          | Medium     |
| 5–6          | Medium     |
| 7–8          | Easy       |
| 9 (CLI PKCE) | HARD 🔥    |
| 10 (Web)     | Medium     |

---

# 🏁 Bottom line

This project isn’t about writing endpoints anymore.

It’s about:

* **system design**
* **security**
* **consistency across interfaces**

If you follow these phases in order, you avoid:

* breaking Stage 2
* auth chaos
* CLI confusion

---