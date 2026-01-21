// Run this script to fix enrollment issues
// Usage: node scripts/fix-enrollments.js

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-facilitator';

// Define schemas
const studentCourseSchema = new mongoose.Schema({
  studentId: String,
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  enrolledAt: { type: Date, default: Date.now }
});

const courseSchema = new mongoose.Schema({
  name: String,
  code: String,
  departmentId: mongoose.Schema.Types.ObjectId
});

const profileSchema = new mongoose.Schema({
  userId: String,
  fullName: String,
  role: String,
  department: mongoose.Schema.Types.ObjectId,
  departmentName: String
});

const StudentCourse = mongoose.model('StudentCourse', studentCourseSchema);
const Course = mongoose.model('Course', courseSchema);
const Profile = mongoose.model('Profile', profileSchema);

async function fixEnrollments() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all enrollments
    const enrollments = await StudentCourse.find().lean();
    console.log(`\n📊 Total enrollments: ${enrollments.length}`);

    let mismatches = 0;
    let toDelete = [];

    for (const enrollment of enrollments) {
      // Get student profile
      const student = await Profile.findOne({ userId: enrollment.studentId }).lean();
      if (!student) {
        console.log(`⚠️  Student not found for enrollment: ${enrollment._id}`);
        continue;
      }

      // Get course
      const course = await Course.findById(enrollment.courseId).lean();
      if (!course) {
        console.log(`⚠️  Course not found: ${enrollment.courseId}`);
        toDelete.push(enrollment._id);
        continue;
      }

      // Check department match
      const studentDept = student.department?.toString();
      const courseDept = course.departmentId?.toString();

      if (courseDept && studentDept && courseDept !== studentDept) {
        mismatches++;
        console.log(`\n❌ Mismatch #${mismatches}:`);
        console.log(`   Student: ${student.fullName} (${student.departmentName || studentDept})`);
        console.log(`   Course: ${course.name} (${courseDept})`);
        console.log(`   Enrollment ID: ${enrollment._id}`);
        toDelete.push(enrollment._id);
      }
    }

    console.log(`\n📋 Summary:`);
    console.log(`   Total enrollments: ${enrollments.length}`);
    console.log(`   Mismatched: ${mismatches}`);
    console.log(`   To delete: ${toDelete.length}`);

    if (toDelete.length > 0) {
      console.log(`\n⚠️  Would you like to delete these ${toDelete.length} enrollments? (yes/no)`);
      
      // Auto-delete for script - comment out if you want manual confirmation
      const result = await StudentCourse.deleteMany({ _id: { $in: toDelete } });
      console.log(`✅ Deleted ${result.deletedCount} mismatched enrollments`);
    } else {
      console.log(`\n✅ No mismatched enrollments found!`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixEnrollments();
