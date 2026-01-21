import mongoose, { Schema, Document } from 'mongoose'

// User Schema for Authentication
export interface IUser extends Document {
  _id: any
  email: string
  password: string
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Profile Schema
export interface IProfile extends Document {
  _id: any
  userId: string
  email: string
  fullName: string
  role: 'student' | 'faculty' | 'hod' | 'principal' | 'admin'
  department: string | null
  departmentName?: string | null
  enrollmentNumber: string | null
  phone: string | null
  avatarUrl: string | null
  isApprovalPending: boolean
  approvalStatus: 'pending' | 'approved' | 'rejected'
  createdAt: Date
  updatedAt: Date
}

const profileSchema = new Schema<IProfile>({
  userId: { type: String, required: true, unique: true, sparse: true, index: true },
  email: { type: String, required: true, lowercase: true, index: true },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['student', 'faculty', 'hod', 'principal', 'admin'], required: true, index: true },
  department: { type: String, default: null, index: true },
  departmentName: { type: String, default: null },
  enrollmentNumber: { type: String, default: null },
  phone: { type: String, default: null },
  avatarUrl: { type: String, default: null },
  isApprovalPending: { type: Boolean, default: true },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Add compound indexes for common queries
profileSchema.index({ role: 1, approvalStatus: 1 })
profileSchema.index({ department: 1, role: 1 })
profileSchema.index({ role: 1, department: 1, approvalStatus: 1 })

// Department Schema
export interface IDepartment extends Document {
  _id: any
  name: string
  description: string | null
  abbreviation: string
  hodId: string | null
  hodName?: string | null
  faculties: string[] // Array of faculty user IDs
  createdAt: Date
  updatedAt: Date
}

const departmentSchema = new Schema<IDepartment>({
  name: { type: String, required: true, unique: true, sparse: true, index: true },
  description: { type: String, default: null },
  abbreviation: { type: String, required: true, unique: true, sparse: true, index: true },
  hodId: { type: String, default: null },
  hodName: { type: String, default: null },
  faculties: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

departmentSchema.index({ hodId: 1 })
departmentSchema.index({ faculties: 1 })

// Academic Year Schema
export interface IAcademicYear extends Document {
  _id: any
  year: string
  startDate: Date
  endDate: Date
  isActive: boolean
  createdAt: Date
}

const academicYearSchema = new Schema<IAcademicYear>({
  year: { type: String, required: true, unique: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

// Semester Schema
export interface ISemester extends Document {
  _id: any
  number: number
  name: string
  departmentId: string
  academicYearId: string
  startDate: Date
  endDate: Date
  isLocked: boolean
  createdAt: Date
}

const semesterSchema = new Schema<ISemester>({
  number: { type: Number, required: true },
  name: { type: String, required: true },
  departmentId: { type: String, required: true },
  academicYearId: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isLocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

// Program Schema
export interface IProgram extends Document {
  _id: any
  name: string
  code: string
  departmentId: string
  duration: number
  createdAt: Date
}

const programSchema = new Schema<IProgram>({
  name: { type: String, required: true },
  code: { type: String, required: true },
  departmentId: { type: String, required: true },
  duration: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
})

// Course Schema
export interface ICourse extends Document {
  _id: any
  code: string
  name: string
  description: string | null
  departmentId: string | null
  facultyId: string | null
  semester: number | null
  credits: number
  createdAt: Date
  updatedAt: Date
}

const courseSchema = new Schema<ICourse>({
  code: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: null },
  departmentId: { type: String, default: null },
  facultyId: { type: String, default: null },
  semester: { type: Number, default: null },
  credits: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Student Course Schema
export interface IStudentCourse extends Document {
  _id: any
  studentId: string
  courseId: string
  enrolledAt: Date
}

const studentCourseSchema = new Schema<IStudentCourse>({
  studentId: { type: String, required: true },
  courseId: { type: String, required: true },
  enrolledAt: { type: Date, default: Date.now },
})

// Notice Schema
export interface INotice extends Document {
  _id: any
  title: string
  content: string
  type: string
  priority: string
  authorId: string | null
  departmentId: string | null
  isGlobal: boolean
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const noticeSchema = new Schema<INotice>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, required: true },
  priority: { type: String, required: true },
  authorId: { type: String, default: null },
  departmentId: { type: String, default: null },
  isGlobal: { type: Boolean, default: false },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Assignment Schema
export interface IAssignment extends Document {
  _id: any
  title: string
  description: string | null
  courseId: string
  facultyId: string | null
  dueDate: Date
  maxScore: number
  fileUrl: string | null
  createdAt: Date
  updatedAt: Date
}

const assignmentSchema = new Schema<IAssignment>({
  title: { type: String, required: true },
  description: { type: String, default: null },
  courseId: { type: String, required: true },
  facultyId: { type: String, default: null },
  dueDate: { type: Date, required: true },
  maxScore: { type: Number, required: true },
  fileUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Assignment Submission Schema
export interface IAssignmentSubmission extends Document {
  _id: any
  assignmentId: string
  studentId: string
  fileUrl: string
  fileName: string | null
  score: number | null
  feedback: string | null
  submittedAt: Date
  gradedAt: Date | null
}

const assignmentSubmissionSchema = new Schema<IAssignmentSubmission>({
  assignmentId: { type: String, required: true },
  studentId: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, default: null },
  score: { type: Number, default: null },
  feedback: { type: String, default: null },
  submittedAt: { type: Date, default: Date.now },
  gradedAt: { type: Date, default: null },
})

// Study Material Schema
export interface IStudyMaterial extends Document {
  _id: any
  title: string
  description: string | null
  courseId: string
  facultyId: string | null
  fileUrl: string
  fileName: string | null
  fileType: string | null
  createdAt: Date
}

const studyMaterialSchema = new Schema<IStudyMaterial>({
  title: { type: String, required: true },
  description: { type: String, default: null },
  courseId: { type: String, required: true },
  facultyId: { type: String, default: null },
  fileUrl: { type: String, required: true },
  fileName: { type: String, default: null },
  fileType: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
})

// Attendance Schema
export interface IAttendance extends Document {
  _id: any
  courseId: string
  studentId: string
  date: Date
  status: 'present' | 'absent' | 'late'
  markedAt: Date
}

const attendanceSchema = new Schema<IAttendance>({
  courseId: { type: String, required: true },
  studentId: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], required: true },
  markedAt: { type: Date, default: Date.now },
})

// Message Schema
export interface IMessage extends Document {
  _id: any
  senderId: string
  recipientId: string
  content: string
  isRead: boolean
  createdAt: Date
}

const messageSchema = new Schema<IMessage>({
  senderId: { type: String, required: true },
  recipientId: { type: String, required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

// Timetable Schema
export interface ITimetable extends Document {
  _id: any
  courseId: string
  day: string
  startTime: string
  endTime: string
  room: string | null
  faculty: string | null
}

const timetableSchema = new Schema<ITimetable>({
  courseId: { type: String, required: true },
  day: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  room: { type: String, default: null },
  faculty: { type: String, default: null },
})

// Bonafide Certificate Schema - Multi-level Approval Workflow
export interface IBonafideCertificate extends Document {
  _id: any
  studentId: string
  studentName: string
  studentEmail: string
  department: string | null
  enrollmentNumber: string | null
  purpose: string
  status: 'pending' | 'faculty-approved' | 'hod-approved' | 'admin-approved' | 'issued' | 'rejected'
  requestedAt: Date
  approvalHistory: Array<{
    approverRole: 'faculty' | 'hod' | 'admin'
    approverId: string
    approverName: string
    action: 'approved' | 'rejected'
    timestamp: Date
    comments: string | null
  }>
  certificateUrl: string | null
  createdAt: Date
  updatedAt: Date
}

const bonafideCertificateSchema = new Schema<IBonafideCertificate>({
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  department: { type: String, default: null, index: true },
  enrollmentNumber: { type: String, default: null },
  purpose: { type: String, required: true },
  status: { type: String, enum: ['pending', 'faculty-approved', 'hod-approved', 'admin-approved', 'issued', 'rejected'], default: 'pending', index: true },
  requestedAt: { type: Date, default: Date.now },
  approvalHistory: [{
    approverRole: { type: String, enum: ['faculty', 'hod', 'admin'], required: true },
    approverId: { type: String, required: true },
    approverName: { type: String, required: true },
    action: { type: String, enum: ['approved', 'rejected'], required: true },
    timestamp: { type: Date, default: Date.now },
    comments: { type: String, default: null },
  }],
  certificateUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Add compound index for department + status queries
bonafideCertificateSchema.index({ department: 1, status: 1 })

// Leaving Certificate Schema - Multi-level Approval Workflow
export interface ILeavingCertificate extends Document {
  _id: any
  studentId: string
  studentName: string
  studentEmail: string
  department: string | null
  enrollmentNumber: string | null
  reason: string
  status: 'pending' | 'faculty-approved' | 'hod-approved' | 'admin-approved' | 'issued' | 'rejected'
  requestedAt: Date
  approvalHistory: Array<{
    approverRole: 'faculty' | 'hod' | 'admin'
    approverId: string
    approverName: string
    action: 'approved' | 'rejected'
    timestamp: Date
    comments: string | null
  }>
  certificateUrl: string | null
  createdAt: Date
  updatedAt: Date
}

const leavingCertificateSchema = new Schema<ILeavingCertificate>({
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  department: { type: String, default: null, index: true },
  enrollmentNumber: { type: String, default: null },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'faculty-approved', 'hod-approved', 'admin-approved', 'issued', 'rejected'], default: 'pending', index: true },
  requestedAt: { type: Date, default: Date.now },
  approvalHistory: [{
    approverRole: { type: String, enum: ['faculty', 'hod', 'admin'], required: true },
    approverId: { type: String, required: true },
    approverName: { type: String, required: true },
    action: { type: String, enum: ['approved', 'rejected'], required: true },
    timestamp: { type: Date, default: Date.now },
    comments: { type: String, default: null },
  }],
  certificateUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Add compound index for department + status queries
leavingCertificateSchema.index({ department: 1, status: 1 })

// Fee Payment Schema
export interface IFeePayment extends Document {
  _id: any
  studentId: string
  studentName: string
  studentEmail: string
  department: string | null
  amount: number
  paymentType: 'tuition' | 'examination' | 'activity' | 'other'
  semester: number | null
  status: 'pending' | 'paid' | 'rejected' | 'failed'
  transactionId: string | null
  paymentMethod: 'online' | 'cash' | 'check' | 'bank_transfer'
  paymentDate: Date | null
  paidAt: Date | null
  receiptUrl: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

const feePaymentSchema = new Schema<IFeePayment>({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  department: { type: String, default: null },
  amount: { type: Number, required: true },
  paymentType: { type: String, enum: ['tuition', 'examination', 'activity', 'other'], required: true },
  semester: { type: Number, default: null },
  status: { type: String, enum: ['pending', 'paid', 'rejected', 'failed'], default: 'pending' },
  transactionId: { type: String, default: null },
  paymentMethod: { type: String, enum: ['online', 'cash', 'check', 'bank_transfer'], default: 'online' },
  paymentDate: { type: Date, default: null },
  paidAt: { type: Date, default: null },
  receiptUrl: { type: String, default: null },
  notes: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Audit Log Schema
export interface IAuditLog extends Document {
  _id: any
  userId: string
  userName: string
  userRole: string
  department: string | null
  action: string
  resource: string
  resourceId: string | null
  changes: Record<string, any>
  ipAddress: string | null
  timestamp: Date
  status: 'success' | 'failure'
  errorMessage: string | null
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userRole: { type: String, required: true },
  department: { type: String, default: null },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: { type: String, default: null },
  changes: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['success', 'failure'], default: 'success' },
  errorMessage: { type: String, default: null },
})

// Scholarship Schema
export interface IScholarship extends Document {
  _id: any
  studentId: any
  departmentId: any
  fullName: string
  aadhaarNumber: string
  phoneNumber: string
  address: string
  selectedScholarships: string[]
  documents: {
    sscMarksheet?: string
    diplomaSem1Marksheet?: string
    diplomaSem2Marksheet?: string
  }
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  reviewedBy?: any
  reviewedAt?: Date
  remarks?: string
  createdAt: Date
  updatedAt: Date
}

const scholarshipSchema = new Schema<IScholarship>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true, unique: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  fullName: { type: String, required: true },
  aadhaarNumber: { type: String, required: true, match: /^\d{12}$/ },
  phoneNumber: { type: String, required: true, match: /^\d{10}$/ },
  address: { type: String, required: true },
  selectedScholarships: [{ type: String, required: true }],
  documents: {
    sscMarksheet: String,
    diplomaSem1Marksheet: String,
    diplomaSem2Marksheet: String,
  },
  status: { type: String, enum: ['pending', 'under_review', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'Profile' },
  reviewedAt: Date,
  remarks: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Note: studentId unique index is already defined in field declaration above

// Create and export models
export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema)
export const Profile = mongoose.models.Profile || mongoose.model<IProfile>('Profile', profileSchema)
export const Department = mongoose.models.Department || mongoose.model<IDepartment>('Department', departmentSchema)
export const AcademicYear = mongoose.models.AcademicYear || mongoose.model<IAcademicYear>('AcademicYear', academicYearSchema)
export const Semester = mongoose.models.Semester || mongoose.model<ISemester>('Semester', semesterSchema)
export const Program = mongoose.models.Program || mongoose.model<IProgram>('Program', programSchema)
export const Course = mongoose.models.Course || mongoose.model<ICourse>('Course', courseSchema)
export const StudentCourse = mongoose.models.StudentCourse || mongoose.model<IStudentCourse>('StudentCourse', studentCourseSchema)
export const Notice = mongoose.models.Notice || mongoose.model<INotice>('Notice', noticeSchema)
export const Assignment = mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', assignmentSchema)
export const AssignmentSubmission = mongoose.models.AssignmentSubmission || mongoose.model<IAssignmentSubmission>('AssignmentSubmission', assignmentSubmissionSchema)
export const StudyMaterial = mongoose.models.StudyMaterial || mongoose.model<IStudyMaterial>('StudyMaterial', studyMaterialSchema)
export const Attendance = mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', attendanceSchema)
export const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema)
export const Timetable = mongoose.models.Timetable || mongoose.model<ITimetable>('Timetable', timetableSchema)
export const BonafideCertificate = mongoose.models.BonafideCertificate || mongoose.model<IBonafideCertificate>('BonafideCertificate', bonafideCertificateSchema)
export const LeavingCertificate = mongoose.models.LeavingCertificate || mongoose.model<ILeavingCertificate>('LeavingCertificate', leavingCertificateSchema)
export const FeePayment = mongoose.models.FeePayment || mongoose.model<IFeePayment>('FeePayment', feePaymentSchema)
export const Scholarship = mongoose.models.Scholarship || mongoose.model<IScholarship>('Scholarship', scholarshipSchema)
export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema)

