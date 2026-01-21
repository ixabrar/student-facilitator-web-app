import mongoose, { Schema, Document } from 'mongoose'

export interface IScholarship extends Document {
  studentId: mongoose.Types.ObjectId
  departmentId: mongoose.Types.ObjectId
  
  // Student Information
  fullName: string
  aadhaarNumber: string
  phoneNumber: string
  address: string
  
  // Selected Scholarships
  selectedScholarships: string[]
  
  // Uploaded Documents
  documents: {
    sscMarksheet?: string
    diplomaSem1Marksheet?: string
    diplomaSem2Marksheet?: string
  }
  
  // Application Status
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
  remarks?: string
  
  createdAt: Date
  updatedAt: Date
}

const scholarshipSchema = new Schema<IScholarship>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    aadhaarNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{12}$/
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{10}$/
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    selectedScholarships: [{
      type: String,
      required: true
    }],
    documents: {
      sscMarksheet: String,
      diplomaSem1Marksheet: String,
      diplomaSem2Marksheet: String
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Profile'
    },
    reviewedAt: Date,
    remarks: String
  },
  {
    timestamps: true
  }
)

// Ensure one application per student
scholarshipSchema.index({ studentId: 1 }, { unique: true })

export const Scholarship = mongoose.models.Scholarship || mongoose.model<IScholarship>('Scholarship', scholarshipSchema)
