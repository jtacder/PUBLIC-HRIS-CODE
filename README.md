# ElectroManage ERP

A full-stack Enterprise Resource Planning (ERP) system designed for Philippine electrical contracting companies. ElectroManage streamlines workforce operations including employee management, QR-based attendance tracking, and payroll processing with Philippine government deductions (SSS, PhilHealth, Pag-IBIG, and withholding tax).

## Features

- **Employee Management**: Complete 201 file management with personal, employment, payroll, and disciplinary records
- **QR-Based Attendance**: Clock-in/out using QR codes with photo verification and GPS geolocation
- **Payroll Processing**: Automated calculations with Philippine government deductions (SSS, PhilHealth, Pag-IBIG, TRAIN Law)
- **Project Management**: Multi-site project tracking with geo-fencing for attendance validation
- **Task Management**: Kanban-style task board with status tracking
- **Disciplinary Actions**: NTE (Notice to Explain) workflow with 5-day response deadline
- **Expense Tracking**: Expense submission and approval workflow
- **Leave Management**: Leave request and approval system with configurable leave types
- **Role-Based Access**: Admin/HR, Engineer, and Worker roles with appropriate permissions

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for bundling and development
- TanStack React Query for server state
- Shadcn/UI + Radix UI for components
- Tailwind CSS for styling
- Wouter for routing

### Backend
- Node.js with Express.js
- TypeScript with ES modules
- Drizzle ORM for database operations
- PostgreSQL database
- Passport.js for authentication

## Prerequisites

- **Node.js**: v20.x or higher
- **PostgreSQL**: v14.x or higher (or use Replit's built-in database)
- **npm**: v10.x or higher

## Environment Variables

Create a `.env` file in the root directory with the following variables. See `.env.example` for a template.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for session encryption (min 32 characters) |
| `NODE_ENV` | No | Environment: `development`, `production`, or `test` (default: `development`) |
| `PORT` | No | Server port (default: `5000`) |

### Replit-Specific Variables (Auto-configured)

When running on Replit, these are automatically set:
- `REPL_ID`: Replit project identifier
- `REPLIT_DOMAINS`: Configured domains
- `REPLIT_DEV_DOMAIN`: Development domain
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: Database credentials

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd electromanage
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push schema changes to database |

## Project Structure

```
electromanage/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   └── pages/          # Page components
├── server/                 # Backend Express application
│   ├── config/             # Configuration management
│   ├── domains/            # Domain-specific modules
│   ├── middleware/         # Express middleware
│   ├── routes/             # API route handlers
│   └── utils/              # Server utilities
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle ORM schema definitions
└── migrations/             # Database migrations
```

## API Endpoints

### Authentication
- `GET /api/auth/me` - Get current user
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout

### Employees
- `GET /api/employees` - List all employees
- `POST /api/employees` - Create employee
- `GET /api/employees/:id` - Get employee by ID
- `PATCH /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Attendance
- `GET /api/attendance/today` - Get today's attendance
- `POST /api/attendance/clock-in` - Clock in with QR code
- `POST /api/attendance/clock-out` - Clock out

### Payroll
- `GET /api/payroll` - List payroll records
- `POST /api/payroll/generate` - Generate payroll for period

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project

## Philippine Payroll Calculations

The system implements 2024/2025 Philippine government contribution tables:

- **SSS**: Based on monthly salary credit brackets
- **PhilHealth**: 5% of monthly basic salary (50% employee share)
- **Pag-IBIG**: 2% of monthly compensation (max ₱100)
- **Withholding Tax**: TRAIN Law brackets applied to taxable income

## Security Features

- Helmet.js for HTTP security headers
- Rate limiting on API endpoints
- Session-based authentication with PostgreSQL store
- Password hashing with bcrypt (12 rounds)
- Input validation with Zod schemas
- CSRF protection

## Accessibility

The application follows WCAG 2.1 AA guidelines:
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Skip-to-content link
- Minimum 4.5:1 color contrast ratio

## License

MIT License
