const mongoose = require('mongoose');

async function checkData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/student-facilitator');
    console.log('Connected to MongoDB\n');
    
    const Profile = mongoose.model('Profile', new mongoose.Schema({}, { strict: false, collection: 'profiles' }));
    const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false, collection: 'courses' }));
    const Department = mongoose.model('Department', new mongoose.Schema({}, { strict: false, collection: 'departments' }));
    
    // Get departments
    console.log('=== DEPARTMENTS ===');
    const departments = await Department.find({});
    departments.forEach(dept => {
      console.log(`${dept.name} (${dept.shortName}) - ID: ${dept._id}`);
    });
    
    // Get all HODs
    console.log('\n=== HODs ===');
    const hods = await Profile.find({ role: 'hod' });
    if (hods.length === 0) {
      console.log('No HODs found');
    } else {
      hods.forEach(hod => {
        console.log(`${hod.fullName || hod.full_name} - Dept: ${hod.departmentName || hod.department}`);
      });
    }
    
    // Get all faculty
    console.log('\n=== FACULTY ===');
    const faculty = await Profile.find({ role: 'faculty' });
    if (faculty.length === 0) {
      console.log('No faculty found');
    } else {
      faculty.forEach(f => {
        console.log(`${f.fullName || f.full_name} - Dept: ${f.departmentName || f.department}`);
      });
    }
    
    // Get courses by department
    console.log('\n=== COURSES ===');
    const courses = await Course.find({});
    if (courses.length === 0) {
      console.log('No courses found');
    } else {
      const coursesByDept = {};
      for (const course of courses) {
        const deptId = course.departmentId?.toString() || 'Unknown';
        if (!coursesByDept[deptId]) {
          coursesByDept[deptId] = [];
        }
        coursesByDept[deptId].push(course);
      }
      
      for (const [deptId, deptCourses] of Object.entries(coursesByDept)) {
        const dept = departments.find(d => d._id.toString() === deptId);
        console.log(`\n${dept ? dept.name : deptId}: ${deptCourses.length} courses`);
        deptCourses.forEach(c => {
          console.log(`  - ${c.name} (${c.code})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkData();
