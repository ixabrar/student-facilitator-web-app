const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/student-webapp').then(async () => {
  const Profile = mongoose.connection.collection('profiles');
  const all = await Profile.find({}).limit(20).toArray();
  
  console.log('All profiles:');
  all.forEach((p, i) => {
    console.log(`${i+1}. ${p.fullName || p.full_name} - Role: ${p.role}, Dept: ${p.department}, DeptName: ${p.departmentName}`);
  });
  
  const courses = await mongoose.connection.collection('courses').find({}).toArray();
  console.log('\nAll courses:');
  courses.forEach((c, i) => {
    console.log(`${i+1}. ${c.name} (${c.code}) - DeptID: ${c.departmentId}`);
  });
  
  await mongoose.disconnect();
}).catch(err => console.error('Error:', err));
