# Student Facilitator Web Application

A comprehensive college ERP (Enterprise Resource Planning) system built with Next.js, TypeScript, and MongoDB. This application provides role-based access control, multi-level approval workflows, and department-level data isolation for managing students, faculty, courses, and administrative operations.

## Overview

The Student Facilitator Web Application is designed to streamline college administration by providing a centralized platform for managing all academic and administrative activities. The system implements a 5-tier hierarchical role structure with strict permission controls and department isolation.

## Key Features

### Role-Based Access Control
- 5-level hierarchy: Admin, Principal, HOD, Faculty, Student
- Granular permissions for each role
- Department-level data isolation
- Comprehensive audit logging

### Academic Management
- Course creation and enrollment
- Assignment submission and grading
- Attendance tracking and reporting
- Study material distribution
- Timetable management

### Certificate Management
- Bonafide certificate requests
- Leaving certificate (Transfer Certificate)
- Multi-level approval workflow
- Digital record keeping

### Administrative Functions
- Department management
- Faculty account approval
- HOD assignment
- Academic year management
- Fee payment tracking

### Communication
- Notice board system
- Internal messaging
- Role-based notifications
- Department-specific announcements

## Technology Stack

### Frontend
- Next.js 15 (React Framework with App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- React Hook Form with Zod validation

### Backend
- Next.js API Routes
- MongoDB database
- Mongoose ODM
- JWT authentication
- Cookie-based session management

### Development Tools
- ESLint for code quality
- Turbopack for fast builds
- TypeScript for type safety

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 18 or higher)
- MongoDB (version 6 or higher)
- Git
- npm or yarn package manager

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd student-facilitator-web-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory with the following variables:

```env
MONGODB_URI=mongodb://localhost:27017/student-webapp
JWT_SECRET=your-secure-jwt-secret-key-change-this
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Important**: Never commit `.env.local` to version control. The file is already included in `.gitignore`.

### 4. Start MongoDB
Ensure MongoDB is running on your system:

**Local MongoDB:**
```bash
mongod
```

**Or use MongoDB Atlas (Cloud):**
Update MONGODB_URI in `.env.local` with your Atlas connection string:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
```

### 5. Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 6. Create Initial Admin User
1. Navigate to `http://localhost:3000/register`
2. Create an account with role set to "admin"
3. Use this admin account to manage the system

## Project Structure

```
student-facilitator-web-app/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/               # API routes
│   │   │   ├── admin/        # Admin endpoints
│   │   │   ├── auth/         # Authentication
│   │   │   ├── courses/      # Course management
│   │   │   ├── departments/  # Department management
│   │   │   └── ...
│   │   ├── dashboard/        # Dashboard pages
│   │   ├── login/           # Login page
│   │   └── register/        # Registration page
│   ├── components/           # Reusable React components
│   │   ├── ui/              # UI components
│   │   └── providers/       # Context providers
│   ├── lib/                 # Utility libraries
│   │   ├── db/             # Database models and connection
│   │   ├── rbac.ts         # Role-based access control
│   │   └── utils.ts        # Utility functions
│   └── hooks/              # Custom React hooks
├── public/                  # Static assets
│   └── uploads/            # User-uploaded files
├── scripts/                # Database scripts
├── .env.local             # Environment variables (create this)
├── package.json           # Dependencies
└── tsconfig.json         # TypeScript configuration
```

## Role Hierarchy

The system implements a 5-tier role hierarchy:

### Admin (Level 5)
- Complete system control
- Create and manage departments
- Approve faculty accounts
- Manage principals
- View all audit logs
- Final approval authority

### Principal (Level 4)
- Access all departments
- Assign HOD roles
- Approve cross-department requests
- View global analytics
- Manage certificate approvals

### HOD - Head of Department (Level 3)
- Manage own department
- Add/edit/remove faculty
- Approve department requests
- Assign courses to faculty
- View department analytics

### Faculty (Level 2)
- Create courses and assignments
- Mark attendance
- Upload study materials
- Initial approval of student requests
- Grade submissions

### Student (Level 1)
- View courses and materials
- Submit assignments
- Request certificates
- View attendance
- Access department resources

## Core Workflows

### Faculty Approval Workflow
1. Faculty registers an account (status: pending)
2. Admin reviews faculty profile
3. Admin approves or rejects
4. Approved faculty can login and access system

### Certificate Approval Workflow
1. Student submits request (status: pending)
2. Faculty reviews and approves (status: faculty-approved)
3. HOD reviews and approves (status: hod-approved)
4. Principal reviews and approves (status: principal-approved)
5. Admin gives final approval (status: admin-approved)
6. Certificate is issued (status: issued)

### Course Enrollment Workflow
1. Faculty creates course
2. Student browses available courses
3. Student enrolls in course
4. Faculty marks attendance and creates assignments
5. Student submits assignments
6. Faculty grades submissions

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Admin Endpoints
- `GET /api/admin/departments` - List departments
- `POST /api/admin/departments` - Create department
- `GET /api/admin/faculty-approvals` - Pending faculty
- `PUT /api/admin/faculty-approvals` - Approve/reject faculty
- `POST /api/admin/designate-hod` - Assign HOD role

### Course Endpoints
- `GET /api/courses` - List courses
- `POST /api/courses` - Create course
- `PUT /api/courses/[id]` - Update course
- `DELETE /api/courses/[id]` - Delete course

### Certificate Endpoints
- `GET /api/bonafide-certificates` - List certificates
- `POST /api/bonafide-certificates` - Request certificate
- `PUT /api/bonafide-certificates/[id]` - Approve/reject

For complete API documentation, refer to `learn.md`.

## Security Features

### Authentication
- JWT-based authentication
- Secure password hashing
- Token expiration (7 days)
- HTTP-only cookies

### Authorization
- Role-based access control
- Department-level isolation
- Permission verification on every request
- Action-level permissions

### Data Protection
- Input validation with Zod
- SQL injection prevention
- XSS protection
- CSRF protection

### Audit Trail
- All actions logged
- Immutable approval history
- Timestamp tracking
- IP address logging

## Development

### Available Scripts

#### Development Mode
```bash
npm run dev
```
Starts development server with Turbopack on `http://localhost:3000`

#### Build for Production
```bash
npm run build
```
Creates optimized production build

#### Start Production Server
```bash
npm run start
```
Runs production server (requires build first)

#### Linting
```bash
npm run lint
```
Runs ESLint to check code quality

### Database Scripts

The `scripts/` folder contains utility scripts for database management:

- `check-data.js` - Verify database contents
- `check-student.js` - Check student records
- `clear-db.js` - Clear all collections
- `fix-department-data.js` - Fix department inconsistencies
- `fix-enrollments.js` - Fix enrollment records

## Testing

### Manual Testing
1. Create users with different roles
2. Test role-specific features
3. Verify department isolation
4. Test approval workflows
5. Check audit logs

### Testing Checklist
- User registration and login
- Role-based dashboard access
- Department data isolation
- Certificate approval chain
- Course creation and enrollment
- Attendance marking
- Assignment submission
- File uploads
- Notice board
- Messaging system

## Troubleshooting

### MongoDB Connection Issues
If you encounter connection errors:
1. Verify MongoDB is running: `mongod`
2. Check MONGODB_URI in `.env.local`
3. Test connection: `mongosh`

### JWT Token Errors
If authentication fails:
1. Clear browser localStorage
2. Verify JWT_SECRET in `.env.local`
3. Re-login to get new token

### Permission Denied Errors
If you get 403 errors:
1. Verify user role in database
2. Check department assignment
3. Ensure faculty account is approved

### Build Errors
If build fails:
1. Delete `node_modules` and `.next` folders
2. Run `npm install`
3. Run `npm run build`

## Production Deployment

### Preparation
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure MongoDB Atlas
4. Enable HTTPS
5. Configure CORS properly
6. Set up rate limiting
7. Enable production logging
8. Configure backups

### Recommended Platforms
- Vercel (Recommended for Next.js)
- Railway
- DigitalOcean
- AWS

### Environment Variables for Production
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=strong-random-secret-key
NEXT_PUBLIC_API_URL=https://yourdomain.com
NODE_ENV=production
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## Support

For detailed information about system architecture, features, and workflows, refer to the `learn.md` file included in this repository.

## License

This project is private and proprietary. All rights reserved.

## Version

Current Version: 0.1.0

## Last Updated

January 2026
