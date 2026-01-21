# Complete Learning Guide - Student Facilitator Web Application

## Table of Contents
1. [What is this Project?](#what-is-this-project)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Role Hierarchy](#role-hierarchy)
5. [Database Structure](#database-structure)
6. [Setup and Installation](#setup-and-installation)
7. [Authentication System](#authentication-system)
8. [Core Features](#core-features)
9. [API Endpoints](#api-endpoints)
10. [Approval Workflows](#approval-workflows)
11. [Department Isolation](#department-isolation)
12. [Security and Permissions](#security-and-permissions)
13. [Testing Guide](#testing-guide)
14. [Common Issues](#common-issues)

---

## What is this Project?

This is a complete college ERP (Enterprise Resource Planning) system designed to manage student-faculty interactions, course management, attendance tracking, certificate approvals, and administrative operations. The system implements strict role-based access control with a 5-level hierarchy.

### Key Goals:
- Manage students, faculty, and departments efficiently
- Implement secure role-based access control
- Handle multi-level approval workflows
- Maintain department-level isolation
- Track all system activities through audit logs

---

## Technology Stack

### Frontend:
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable UI components
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### Backend:
- **Next.js API Routes** - Server-side API endpoints
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JSON Web Tokens (JWT)** - Authentication

### Development Tools:
- **ESLint** - Code linting
- **Turbopack** - Fast build tool

---

## System Architecture

The application follows a 5-tier role hierarchy:

```
Admin (Level 5 - Highest)
    ↓
Principal (Level 4 - All departments)
    ↓
HOD (Level 3 - Own department)
    ↓
Faculty (Level 2 - Assigned courses)
    ↓
Student (Level 1 - Own data)
```

### Architecture Flow:
1. **User Authentication**: Login with email/password
2. **Role Verification**: System checks user role and permissions
3. **Department Check**: Verifies user has access to requested department
4. **Data Access**: Returns only authorized data
5. **Audit Logging**: Records all actions for compliance

---

## Role Hierarchy

### 1. Admin (System Administrator)
- **Access**: Complete system control
- **Permissions**:
  - Create/edit/delete departments
  - Create principals
  - Approve faculty accounts
  - Manage academic years and semesters
  - View all audit logs
  - Override all decisions
  
### 2. Principal
- **Access**: All departments (cross-department)
- **Permissions**:
  - View all departments and data
  - Assign HOD roles to faculty
  - Manage certificate approvals across departments
  - View global analytics
  - Approve escalated requests

### 3. HOD (Head of Department)
- **Access**: Own department only
- **Permissions**:
  - Add/edit/remove faculty in department
  - Assign courses to faculty
  - Approve bonafide/leaving certificates
  - View department students and attendance
  - Manage department materials

### 4. Faculty
- **Access**: Assigned courses and department
- **Permissions**:
  - Create assignments and materials
  - Mark attendance
  - View enrolled students
  - Initial approval of student requests
  - Upload course content

### 5. Student
- **Access**: Own data and department
- **Permissions**:
  - View courses and faculty in department
  - Submit assignments
  - Request certificates
  - View own attendance
  - Access study materials

---

## Database Structure

### Core Collections:

#### 1. profiles
Stores all user information:
- userId (unique)
- email
- fullName
- role (admin/principal/hod/faculty/student)
- department (reference to departments)
- approvalStatus (pending/approved/rejected)
- isHOD (boolean)

#### 2. departments
Stores department information:
- name (Computer Science, Electronics, etc.)
- abbreviation (CSE, ECE, etc.)
- hodId (reference to profile)
- createdAt

#### 3. courses
Stores course information:
- courseName
- courseCode
- department (reference)
- facultyId (reference to profile)
- semester
- credits

#### 4. enrollments
Links students to courses:
- studentId (reference to profile)
- courseId (reference to courses)
- enrollmentDate
- status

#### 5. bonafidecertificates
Certificate requests with approval chain:
- studentId
- purpose
- status (pending/faculty-approved/hod-approved/admin-approved/issued)
- approvalHistory (array of approval records)
- department

#### 6. leavingcertificates
Similar to bonafide with TC details:
- studentId
- reason
- status
- approvalHistory
- lastExamDate

#### 7. auditlogs
Tracks all system activities:
- userId
- action
- resourceType
- resourceId
- timestamp
- ipAddress
- metadata

---

## Setup and Installation

### Prerequisites:
- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Git

### Step-by-Step Setup:

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd student-facilitator-web-app
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Environment Configuration
Create `.env.local` file in root directory:
```
MONGODB_URI=mongodb://localhost:27017/student-webapp
JWT_SECRET=your-super-secret-jwt-key-change-this
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Important**: Never commit `.env.local` to Git!

#### 4. Start MongoDB
Make sure MongoDB is running on your machine:
```bash
mongod
```

Or use MongoDB Atlas (cloud):
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
```

#### 5. Run Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

#### 6. Create First Admin User
1. Navigate to http://localhost:3000/register
2. Register with role: "admin"
3. Use this admin to create other users

---

## Authentication System

### How Authentication Works:

#### 1. Registration Flow:
```
User enters:
  - Email
  - Password
  - Full Name
  - Role
  - Department (if applicable)
    ↓
System creates profile with status:
  - Admin/Student: approved
  - Faculty: pending (needs admin approval)
    ↓
JWT token generated and returned
    ↓
Token stored in localStorage
```

#### 2. Login Flow:
```
User enters email & password
    ↓
System verifies credentials
    ↓
Checks approval status
    ↓
Generates JWT token with:
  - userId
  - role
  - department
  - expiresIn: 7 days
    ↓
Token sent to client
```

#### 3. Protected Routes:
Every API call checks:
1. Is token present?
2. Is token valid?
3. Does user have permission?
4. Does user have department access?

### JWT Token Structure:
```json
{
  "userId": "user_123",
  "role": "faculty",
  "department": "dept_cse",
  "email": "faculty@college.edu",
  "iat": 1705920000,
  "exp": 1706524800
}
```

---

## Core Features

### 1. Dashboard
Each role sees a customized dashboard:
- **Admin**: System overview, pending approvals
- **Principal**: All departments, approval queue
- **HOD**: Department stats, faculty management
- **Faculty**: Course list, pending assignments
- **Student**: Enrolled courses, attendance

### 2. Course Management
- Faculty creates courses
- HOD assigns faculty to courses
- Students enroll in courses
- Automatic enrollment tracking

### 3. Attendance System
- Faculty marks attendance
- Students view their attendance
- HOD views department attendance
- Automatic percentage calculation

### 4. Assignment System
- Faculty creates assignments
- Students submit assignments
- Faculty grades submissions
- Due date tracking

### 5. Material Sharing
- Faculty uploads study materials
- Students download materials
- Department-wise organization
- File type restrictions (PDF, DOC, PPT)

### 6. Notice Board
- Admin posts system-wide notices
- HOD posts department notices
- Faculty posts course notices
- Priority-based display

### 7. Certificate Management
Two types:
- **Bonafide Certificate**: For bank, travel, etc.
- **Leaving Certificate**: Transfer certificate with TC

Both follow multi-level approval workflow.

### 8. Fee Payment Tracking
- Students submit payment proof
- Admin verifies payments
- Receipt generation
- Payment history

### 9. Timetable Management
- HOD creates department timetable
- Faculty views teaching schedule
- Students view class schedule
- Conflict detection

### 10. Messaging System
- Role-based messaging
- Department-aware routing
- Read/unread status
- Real-time updates

---

## API Endpoints

### Authentication APIs:
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

### Admin APIs:
```
GET    /api/admin/departments
POST   /api/admin/departments
PUT    /api/admin/departments/[id]

GET    /api/admin/academic-years
POST   /api/admin/academic-years

GET    /api/admin/faculty-approvals
PUT    /api/admin/faculty-approvals

POST   /api/admin/designate-hod
DELETE /api/admin/designate-hod

GET    /api/admin/audit-logs
```

### Course APIs:
```
GET    /api/courses
POST   /api/courses
PUT    /api/courses/[id]
DELETE /api/courses/[id]
```

### Enrollment APIs:
```
GET    /api/enrollments
POST   /api/enrollments
DELETE /api/enrollments/[id]
```

### Certificate APIs:
```
GET    /api/bonafide-certificates
POST   /api/bonafide-certificates
PUT    /api/bonafide-certificates/[id]

GET    /api/leaving-certificates
POST   /api/leaving-certificates
PUT    /api/leaving-certificates/[id]
```

### Faculty APIs:
```
GET    /api/faculties
POST   /api/faculties
PUT    /api/faculties/[id]
DELETE /api/faculties/[id]
```

### Attendance APIs:
```
GET    /api/attendance
POST   /api/attendance
PUT    /api/attendance/[id]
```

### Assignment APIs:
```
GET    /api/assignments
POST   /api/assignments
PUT    /api/assignments/[id]

POST   /api/submissions
GET    /api/submissions
```

---

## Approval Workflows

### Certificate Approval Chain:

#### 4-Level Approval Process:
```
Step 1: Student submits request
    ↓
Step 2: Faculty approves (faculty-approved)
    ↓
Step 3: HOD approves (hod-approved)
    ↓
Step 4: Principal approves (principal-approved)
    ↓
Step 5: Admin approves (admin-approved)
    ↓
Final: Certificate issued (issued)
```

### Approval Rules:
1. Cannot skip stages
2. Each approver sees only their pending requests
3. Rejection at any stage stops the process
4. Approval history is immutable
5. Each approval records timestamp and comments

### Example Approval History:
```json
{
  "approvalHistory": [
    {
      "stage": "faculty-approved",
      "approvedBy": "faculty_123",
      "approvedAt": "2026-01-20T10:30:00Z",
      "comments": "Student is regular"
    },
    {
      "stage": "hod-approved",
      "approvedBy": "hod_456",
      "approvedAt": "2026-01-20T14:15:00Z",
      "comments": "Approved for bonafide"
    }
  ]
}
```

---

## Department Isolation

### How It Works:

#### 1. Database Level:
Every query includes department filter:
```javascript
// Students only see their department's faculty
const faculties = await Profile.find({
  department: student.department,
  role: 'faculty'
});
```

#### 2. API Level:
Permission checks before data access:
```javascript
if (user.role !== 'admin' && user.role !== 'principal') {
  if (user.department !== requestedDepartment) {
    return res.status(403).json({ 
      error: 'Access denied to this department' 
    });
  }
}
```

#### 3. Application Level:
UI renders only accessible data:
```javascript
// HOD sees only their department
if (role === 'hod') {
  departments = [userDepartment];
}

// Principal sees all departments
if (role === 'principal') {
  departments = await getAllDepartments();
}
```

### Isolation Matrix:
| Role | View Own Dept | View Other Depts | Edit Own Dept | Edit Other Depts |
|------|---------------|------------------|---------------|------------------|
| Student | Yes | No | No | No |
| Faculty | Yes | No | No | No |
| HOD | Yes | No | Yes | No |
| Principal | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes |

---

## Security and Permissions

### Permission System:

#### RBAC (Role-Based Access Control)
Located in: `src/lib/rbac.ts`

#### Key Functions:

**1. verifyAuth()**
```javascript
// Verifies JWT token and loads user profile
const { user, profile } = await verifyAuth(request);
if (!user) {
  return unauthorized();
}
```

**2. hasPermission()**
```javascript
// Checks if user can perform action
if (!hasPermission(role, 'course:create')) {
  return forbidden();
}
```

**3. canAccessDepartment()**
```javascript
// Verifies department access
if (!canAccessDepartment(userRole, userDept, targetDept)) {
  return forbidden();
}
```

**4. canApproveAtStage()**
```javascript
// Validates approval authority
if (!canApproveAtStage(role, currentStage)) {
  return forbidden();
}
```

### Permission Matrix:

#### Admin Permissions:
- All system operations
- Create/delete departments
- Manage all users
- Override all decisions

#### Principal Permissions:
- View all departments
- Assign HOD roles
- Approve certificates (level 4)
- Cross-department analytics

#### HOD Permissions:
- Manage own department
- Add/edit/remove faculty
- Approve certificates (level 3)
- View department data

#### Faculty Permissions:
- Create courses/assignments
- Mark attendance
- Approve certificates (level 2)
- Upload materials

#### Student Permissions:
- View own data
- Submit assignments
- Request certificates
- View department resources

---

## Testing Guide

### Manual Testing Steps:

#### 1. Test User Registration:
```
1. Open http://localhost:3000/register
2. Create admin user
3. Create faculty user (status: pending)
4. Create student user
5. Verify database entries
```

#### 2. Test Faculty Approval:
```
1. Login as admin
2. Go to Users Management
3. See pending faculty
4. Approve faculty
5. Faculty can now login
```

#### 3. Test HOD Assignment:
```
1. Login as admin
2. Go to Users Management
3. Find approved faculty
4. Click "Assign HOD"
5. Select department
6. Verify HOD role assigned
```

#### 4. Test Department Isolation:
```
1. Create two departments: CSE, ECE
2. Create HOD for each
3. Login as CSE HOD
4. Try to access ECE data
5. Should be denied (403 error)
```

#### 5. Test Certificate Approval:
```
1. Login as student
2. Request bonafide certificate
3. Verify status: pending
4. Login as faculty → approve
5. Verify status: faculty-approved
6. Login as HOD → approve
7. Verify status: hod-approved
8. Login as principal → approve
9. Verify status: principal-approved
10. Login as admin → approve
11. Verify status: issued
```

#### 6. Test Course Creation:
```
1. Login as faculty
2. Create course
3. Login as student
4. Enroll in course
5. Verify enrollment
```

### API Testing with Postman:

#### Test Authentication:
```
POST http://localhost:3000/api/auth/login
Body: {
  "email": "admin@college.edu",
  "password": "password123"
}
```

#### Test Department Creation:
```
POST http://localhost:3000/api/admin/departments
Headers: {
  "Authorization": "Bearer <token>"
}
Body: {
  "name": "Computer Science",
  "abbreviation": "CSE"
}
```

---

## Common Issues

### Issue 1: MongoDB Connection Failed
**Error**: `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution**:
1. Check if MongoDB is running: `mongod`
2. Verify MONGODB_URI in .env.local
3. Test connection: `mongosh`

### Issue 2: JWT Token Invalid
**Error**: `JsonWebTokenError: invalid token`

**Solution**:
1. Check JWT_SECRET in .env.local
2. Clear localStorage and login again
3. Verify token expiry

### Issue 3: Permission Denied
**Error**: `403 Forbidden`

**Solution**:
1. Check user role in database
2. Verify department assignment
3. Check approval status (faculty must be approved)

### Issue 4: Department Not Accessible
**Error**: `Cannot access this department`

**Solution**:
1. Verify user department matches resource department
2. Check if user is admin/principal (cross-dept access)
3. Verify HOD assignment is correct

### Issue 5: Build Errors
**Error**: `Module not found` or `Type error`

**Solution**:
1. Delete node_modules: `rm -rf node_modules`
2. Reinstall: `npm install`
3. Clear Next.js cache: `rm -rf .next`
4. Rebuild: `npm run build`

### Issue 6: File Upload Failed
**Error**: `Failed to upload file`

**Solution**:
1. Check public/uploads/ directory exists
2. Verify file size (max 5MB)
3. Check file type restrictions
4. Ensure proper permissions on uploads folder

---

## Development Tips

### 1. Adding New Role:
1. Update role types in models
2. Add permissions in rbac.ts
3. Update permission matrix
4. Add UI components
5. Update API authorization

### 2. Adding New Feature:
1. Create database model
2. Create API route
3. Add RBAC permissions
4. Create UI components
5. Test thoroughly

### 3. Debugging:
- Check browser console for frontend errors
- Check terminal for backend errors
- Use MongoDB Compass to inspect database
- Use Postman to test APIs
- Check audit logs for user actions

### 4. Best Practices:
- Always use TypeScript types
- Validate all inputs with Zod
- Use proper error handling
- Log all important actions
- Keep components small and reusable
- Write descriptive commit messages

---

## Production Deployment

### Preparation:
1. Set NODE_ENV=production
2. Use strong JWT_SECRET
3. Use MongoDB Atlas (cloud)
4. Enable HTTPS
5. Set up proper CORS
6. Configure rate limiting
7. Enable audit logging
8. Set up backups

### Deployment Platforms:
- **Vercel**: Easy deployment for Next.js
- **Railway**: Simple with MongoDB support
- **DigitalOcean**: Full control
- **AWS**: Enterprise-grade

### Environment Variables:
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-secret>
NEXT_PUBLIC_API_URL=https://yourdomain.com
NODE_ENV=production
```

---

## Support and Resources

### Documentation:
- Next.js: https://nextjs.org/docs
- MongoDB: https://docs.mongodb.com
- Mongoose: https://mongoosejs.com/docs
- Tailwind CSS: https://tailwindcss.com/docs

### Learning Resources:
- Next.js Tutorial: https://nextjs.org/learn
- TypeScript Handbook: https://www.typescriptlang.org/docs
- MongoDB University: https://university.mongodb.com

---

This guide covers everything from basic setup to advanced concepts. Follow each section step by step to understand and work with this ERP system effectively.
