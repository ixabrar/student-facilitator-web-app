# 🎓 EduHub - Student Facilitator Platform

A modern, full-featured web application for managing academic activities. Built for students, faculty, and administrators to collaborate and stay organized.

## ✨ Key Features

- **👤 User Management**: Role-based access (Student, Faculty, Admin)
- **📚 Course Management**: Create, enroll, and manage courses
- **✍️ Assignments**: Upload, submit, and grade assignments
- **📖 Study Materials**: Share and access course materials
- **📅 Timetable**: View class schedules and exam dates
- **✔️ Attendance**: Track attendance records
- **💬 Messaging**: Direct messaging between users
- **📢 Notices**: Global and department-specific announcements
- **🎉 Events**: Manage campus events and activities

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- A Supabase account (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ixabrar/student-facilitator-web-app.git
   cd student-facilitator-web-app
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
   
   Get these from your [Supabase Dashboard](https://supabase.com/dashboard)

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   
   Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js pages
│   ├── page.tsx           # Homepage
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   └── dashboard/         # Protected dashboard routes
├── components/            # Reusable React components
│   ├── ui/               # Pre-built UI components
│   └── providers/        # Auth provider
├── lib/                   # Utilities and helpers
│   └── supabase/         # Database client setup
└── middleware.ts          # Next.js middleware
```

## 🛠️ Technology Stack

**Frontend:**
- [Next.js 15](https://nextjs.org) - React framework
- [React 19](https://react.dev) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Radix UI](https://www.radix-ui.com) - Accessible components

**Backend & Database:**
- [Supabase](https://supabase.com) - Backend as a Service
- PostgreSQL - Database
- [Drizzle ORM](https://orm.drizzle.team) - Database toolkit

**Auth:**
- Supabase Auth - Email/password authentication

## 🗄️ Database Schema

The project uses 12 main tables:
- `profiles` - User information
- `departments` - Academic departments
- `courses` - Course catalog
- `student_courses` - Student enrollments
- `assignments` - Course assignments
- `assignment_submissions` - Student submissions
- `study_materials` - Course materials
- `timetable` - Class schedules
- `attendance` - Attendance records
- `messages` - Private messaging
- `notices` - Announcements
- `events` - Campus events
- `exam_schedules` - Exam planning

## 🔐 Security

- ✅ Environment variables for sensitive data
- ✅ Never commit `.env.local` to git
- ✅ Row-Level Security (RLS) ready with Supabase
- ✅ Password hashing with bcrypt
- ✅ Session-based authentication

## 📦 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Need Help?

- **Documentation**: Check the [Next.js docs](https://nextjs.org/docs)
- **Supabase**: Visit [Supabase docs](https://supabase.com/docs)
- **TypeScript**: See [TypeScript handbook](https://www.typescriptlang.org/docs/)

---

**Happy coding!** 🚀
