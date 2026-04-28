# 📘 Insighta Labs — Intelligence Query Engine

## 🌐 Base URL

```
https://hng14-be-03.onrender.com/
```

---

# 🚀 Overview

This project is a backend system built for **Insighta Labs**, designed to enable fast and flexible querying of demographic profile data.

It supports:

* Advanced filtering
* Sorting
* Pagination
* Natural language query parsing (rule-based)

The system is built using:

* Node.js
* Express.js
* MongoDB (Mongoose)

---

# 🧠 Architecture

The system follows a clean layered architecture:

```
Request → Validation → Parser (for search) → Query Builder → Database → Response
```

### Components

| Layer         | Responsibility                      |
| ------------- | ----------------------------------- |
| Routes        | Endpoint mapping                    |
| Controller    | Handles request/response            |
| Parser        | Converts natural language → filters |
| Query Builder | Converts filters → MongoDB query    |
| Model         | Defines database schema             |
| Utils         | Validation logic                    |

---

# 📁 Project Structure

```
/src
  /models
    Profile.js
  /controllers
    profileController.js
  /services
    queryBuilder.js
    parser.js
  /routes
    profileRoutes.js
  /utils
    validateQuery.js
  /data
    seed_profiles.json
  app.js
  server.js
  seed.js
```

---

# 🧱 Database Schema

Each profile follows this structure:

| Field               | Type                       |
| ------------------- | -------------------------- |
| id                  | UUID v7                    |
| name                | String (unique)            |
| gender              | String ("male" / "female") |
| gender_probability  | Number                     |
| age                 | Number                     |
| age_group           | String                     |
| country_id          | String (ISO code)          |
| country_name        | String                     |
| country_probability | Number                     |
| created_at          | Date (ISO 8601)            |

---

# 🌱 Data Seeding

Profiles are seeded from a JSON file.

### Key Features:

* UUID v7 generated for each record
* `created_at` auto-generated
* Duplicate-safe using **upsert**
* Re-runnable without duplicating data

### Run:

```bash
npm run seed
```

---

# 🔍 Endpoints

---

## 1. GET `/api/profiles`

Fetch all profiles with filtering, sorting, and pagination.

### Supported Filters:

* `gender`
* `age_group`
* `country_id`
* `min_age`
* `max_age`
* `min_gender_probability`
* `min_country_probability`

### Sorting:

* `sort_by`: age | created_at | gender_probability
* `order`: asc | desc

### Pagination:

* `page` (default: 1)
* `limit` (default: 10, max: 50)

---

### Example:

```
/api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=10
```

---

## 2. GET `/api/profiles/search?q=`

Natural language query endpoint.

### Example:

```
/api/profiles/search?q=young males from nigeria
```

---

# 🧠 Natural Language Parsing Approach

The system uses **rule-based parsing** (no AI/LLMs).

### Supported Patterns:

| Phrase           | Mapping                    |
| ---------------- | -------------------------- |
| male / males     | gender = male              |
| female / females | gender = female            |
| young            | min_age = 16, max_age = 24 |
| above X          | min_age = X                |
| teenager         | age_group = teenager       |
| adult            | age_group = adult          |
| from <country>   | country_id mapping         |

---

### Example:

```
"young males from nigeria"
```

Transforms into:

```
gender = male
min_age = 16
max_age = 24
country_id = NG
```

---

# ⚠️ Validation

All query parameters are validated before processing.

Invalid inputs return:

```json
{
  "status": "error",
  "message": "Invalid query parameters"
}
```

---

# ❌ Error Handling

| Code | Description                |
| ---- | -------------------------- |
| 400  | Missing or empty parameter |
| 422  | Invalid query parameters   |
| 500  | Server error               |

---

# ⚡ Performance Considerations

* MongoDB indexing on:

  * `gender`
  * `age`
  * `country_id`
* No full collection scans
* Pagination handled at DB level using `skip` and `limit`
* Parallel queries using `Promise.all`

---

# ⚠️ Limitations

* Cannot interpret complex grammar (e.g., "males not from nigeria")
* No synonym support ("guys", "ladies")
* Limited country mapping (only predefined countries)
* Cannot handle multiple countries in one query
* Order-dependent parsing

---

# ⚙️ Setup Instructions

### 1. Install dependencies

```bash
npm install
```

---

### 2. Configure environment variables

Create `.env`:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

---

### 3. Seed database

```bash
npm run seed
```

---

### 4. Start server

```bash
npm run dev
```

---

# 🔐 Environment Files

* `.env` → not committed (contains secrets)

---

# 📦 Scripts

```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js",
  "seed": "node src/seed.js"
}
```

---

# 🧪 Sample Test Queries

```
/api/profiles?gender=male&min_age=25
/api/profiles?country_id=NG&sort_by=age&order=desc
/api/profiles?page=2&limit=20
/api/profiles/search?q=young males from nigeria
/api/profiles/search?q=females above 30
```

---

# ✅ Final Notes

* CORS enabled (`Access-Control-Allow-Origin: *`)
* All timestamps are in ISO 8601 (UTC)
* UUID v7 used for all IDs
* System designed for scalability and clean separation of concerns
