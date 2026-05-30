# Team Task Tracker API

A robust, multi-tenant REST API for managing team tasks, built with Node.js, Express, TypeScript, PostgreSQL (Prisma), and Redis.

## 🚀 Setup Instructions

This project is fully containerized. You do not need to install Node, PostgreSQL, or Redis on your local machine to run it.

1. **Clone the repository**
2. **Environment Variables**: Create a `.env` file in the root directory (or use the provided defaults in `docker-compose.yml` for local testing).
3. **Run the Application**:
   ```bash
   docker-compose up --build
   ```
4. **View Documentation**: Once running, interactive API documentation is available at:
   [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

## 🧠 Caching Strategy & Invalidation Approach

**Strategy: Cache Versioning**
To optimize the `GET /api/tasks` endpoint (which supports complex pagination and filtering), the results are cached in Redis. 

Instead of performing expensive `KEYS *` scans in Redis to find and delete specific cache keys when a task is updated, this API implements **Cache Versioning**:
1. A master `task_version` integer is stored in Redis for each Organization (e.g., `org:123:task_version = 1`).
2. This version number is injected into every cache key (e.g., `tasks:org_123:v1:page_1...`).
3. **Invalidation:** When a task is created, updated, or deleted, the organization's master version is simply incremented (e.g., to `2`). 
4. This instantly renders all old `v1` cache keys obsolete in `O(1)` time. The old keys are then naturally garbage-collected by Redis via a 5-minute TTL (`setEx`).

---

## 🏛️ DB Design Decision Explained

**Decision: The Explicit `Organization` Model**
Instead of simply linking `Tasks` directly to `Users`, an explicit `Organization` table was introduced.

**Why:** The requirements stated that "Users belong to an organization" and manage tasks "within the organization." By designing the database with a multi-tenant architecture from day one, completely isolated companies can use the same API instance without their data bleeding over. 
Every `User` and `Task` is strictly scoped to an `organizationId`, and the middleware inherently prevents a user from one organization from querying or modifying tasks belonging to another.

---

## 🔮 Future Improvements (Given More Time)

If given more time, I would implement the following enhancements:

1. **Real-time Updates (WebSockets/Socket.io):** Implement the bonus requirement to push live updates to connected clients whenever a task status changes, eliminating the need for frontend polling.
2. **Advanced Rate Limiting:** Implement strict IP-based and User-based rate limiting using Redis to prevent brute-force login attempts and API abuse.
3. **CI/CD Pipeline:** Add GitHub Actions workflows to automatically run the TypeScript compiler (`tsc --noEmit`), run automated Jest test suites, and build the Docker image on every pull request.
4. **Automated Testing:** Write comprehensive unit tests for the `TaskService` state machine logic, and integration tests (Supertest) for the API endpoints.
