import { Profile } from './models'

/**
 * Generate enrollment/faculty ID based on department
 * Example: Computer Science -> CS01, CS02, etc.
 */
export async function generateEnrollmentNumber(department: string, role: 'student' | 'faculty'): Promise<string> {
  if (!department) {
    throw new Error('Department is required')
  }

  // Convert department name to abbreviation
  // Computer Science -> CS, Engineering -> ENG, etc.
  const abbr = department
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 3)

  // Get the count of existing enrollments in this department with this role
  const lastProfile = await Profile.findOne({
    department,
    role,
    enrollmentNumber: { $regex: `^${abbr}` }
  })
    .sort({ enrollmentNumber: -1 })
    .lean()

  let nextNumber = 1
  if (lastProfile?.enrollmentNumber) {
    const match = lastProfile.enrollmentNumber.match(/\d+$/)
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1
    }
  }

  // Format: CS01, CS02, etc.
  return `${abbr}${String(nextNumber).padStart(2, '0')}`
}
