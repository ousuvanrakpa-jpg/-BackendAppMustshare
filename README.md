# Backend — AppMustshare

Node.js + Express + PostgreSQL backend for the AppMustshare case management system.

## Requirements
- Node.js 18+
- PostgreSQL 14+

## Setup

### 1. Configure environment
Edit `.env` with your PostgreSQL credentials:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/appmustshare"
JWT_SECRET="your-secret-key"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

### 2. Create the database
```bash
# In PostgreSQL:
CREATE DATABASE appmustshare;
```

### 3. Run migrations & seed
```bash
npm run db:push       # Push schema to database
npm run db:seed       # Create default users
```

### 4. Start the server
```bash
npm run dev           # Development (nodemon)
npm start             # Production
```

Server runs at **http://localhost:3000**

---

## Default accounts (after seed)
| Role        | Email                        | Password   |
|-------------|------------------------------|------------|
| Admin       | admin@mustshare.go.th        | admin1234  |
| Coordinator | coord@mustshare.go.th        | coord1234  |
| User        | user@mustshare.go.th         | user1234   |

---

## API Endpoints

### Auth
| Method | Path           | Description       |
|--------|----------------|-------------------|
| POST   | /api/auth/login | Login             |
| GET    | /api/auth/me    | Get current user  |

### Cases
| Method | Path                            | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/cases                      | List cases               |
| GET    | /api/cases/:id                  | Get case                 |
| POST   | /api/cases                      | Create case              |
| PUT    | /api/cases/:id                  | Update case              |
| DELETE | /api/cases/:id                  | Delete case (admin)      |
| POST   | /api/cases/:id/request-delete   | Request deletion         |
| POST   | /api/cases/:id/approve-delete   | Approve deletion (admin) |
| POST   | /api/cases/:id/reject-delete    | Reject deletion (admin)  |

### Agencies
| Method | Path               | Description           |
|--------|--------------------|-----------------------|
| GET    | /api/agencies      | List agencies         |
| GET    | /api/agencies/:id  | Get agency            |
| POST   | /api/agencies      | Create agency         |
| PUT    | /api/agencies/:id  | Update agency         |
| DELETE | /api/agencies/:id  | Delete agency (admin) |

### Users
| Method | Path            | Description        |
|--------|-----------------|--------------------|
| GET    | /api/users      | List users (admin) |
| GET    | /api/users/:id  | Get user           |
| POST   | /api/users      | Create user        |
| PUT    | /api/users/:id  | Update user        |
| DELETE | /api/users/:id  | Delete user        |

### System Logs
| Method | Path       | Description   |
|--------|------------|---------------|
| GET    | /api/logs  | Get logs      |
| POST   | /api/logs  | Add log entry |
