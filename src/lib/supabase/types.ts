export type UserRole = 'student' | 'faculty' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  department: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Course {
  id: string
  code: string
  name: string
  description: string | null
  department_id: string | null
  faculty_id: string | null
  semester: number | null
  credits: number
  created_at: string
  updated_at: string
  faculty?: Profile
  department?: Department
}

export interface StudentCourse {
  id: string
  student_id: string
  course_id: string
  enrolled_at: string
  course?: Course
  student?: Profile
}

export interface Notice {
  id: string
  title: string
  content: string
  type: string
  priority: string
  author_id: string | null
  department_id: string | null
  is_global: boolean
  expires_at: string | null
  created_at: string
  updated_at: string
  author?: Profile
}

export interface Assignment {
  id: string
  title: string
  description: string | null
  course_id: string
  faculty_id: string | null
  due_date: string
  max_score: number
  file_url: string | null
  created_at: string
  updated_at: string
  course?: Course
  faculty?: Profile
}

export interface AssignmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  file_url: string
  file_name: string | null
  score: number | null
  feedback: string | null
  submitted_at: string
  graded_at: string | null
  assignment?: Assignment
  student?: Profile
}

export interface StudyMaterial {
  id: string
  title: string
  description: string | null
  course_id: string
  faculty_id: string | null
  file_url: string
  file_name: string | null
  file_type: string | null
  created_at: string
  course?: Course
  faculty?: Profile
}

export interface Timetable {
  id: string
  course_id: string
  day_of_week: number
  start_time: string
  end_time: string
  room: string | null
  created_at: string
  course?: Course
}

export interface Attendance {
  id: string
  student_id: string
  course_id: string
  date: string
  status: 'present' | 'absent' | 'late'
  marked_by: string | null
  created_at: string
  student?: Profile
  course?: Course
}

export interface Message {
  id: string
  sender_id: string | null
  receiver_id: string | null
  subject: string | null
  content: string
  is_read: boolean
  created_at: string
  sender?: Profile
  receiver?: Profile
}

export interface Event {
  id: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  type: string
  created_by: string | null
  department_id: string | null
  is_global: boolean
  created_at: string
  creator?: Profile
}

export interface ExamSchedule {
  id: string
  course_id: string
  exam_type: string
  exam_date: string
  duration_minutes: number
  room: string | null
  instructions: string | null
  created_at: string
  course?: Course
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      departments: {
        Row: Department
        Insert: Omit<Department, 'id' | 'created_at'>
        Update: Partial<Omit<Department, 'id'>>
      }
      courses: {
        Row: Course
        Insert: Omit<Course, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Course, 'id'>>
      }
      student_courses: {
        Row: StudentCourse
        Insert: Omit<StudentCourse, 'id' | 'enrolled_at'>
        Update: Partial<Omit<StudentCourse, 'id'>>
      }
      notices: {
        Row: Notice
        Insert: Omit<Notice, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Notice, 'id'>>
      }
      assignments: {
        Row: Assignment
        Insert: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Assignment, 'id'>>
      }
      assignment_submissions: {
        Row: AssignmentSubmission
        Insert: Omit<AssignmentSubmission, 'id' | 'submitted_at'>
        Update: Partial<Omit<AssignmentSubmission, 'id'>>
      }
      study_materials: {
        Row: StudyMaterial
        Insert: Omit<StudyMaterial, 'id' | 'created_at'>
        Update: Partial<Omit<StudyMaterial, 'id'>>
      }
      timetable: {
        Row: Timetable
        Insert: Omit<Timetable, 'id' | 'created_at'>
        Update: Partial<Omit<Timetable, 'id'>>
      }
      attendance: {
        Row: Attendance
        Insert: Omit<Attendance, 'id' | 'created_at'>
        Update: Partial<Omit<Attendance, 'id'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: Partial<Omit<Message, 'id'>>
      }
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at'>
        Update: Partial<Omit<Event, 'id'>>
      }
      exam_schedules: {
        Row: ExamSchedule
        Insert: Omit<ExamSchedule, 'id' | 'created_at'>
        Update: Partial<Omit<ExamSchedule, 'id'>>
      }
    }
    Enums: {
      user_role: UserRole
    }
  }
}
