const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/student-webapp').then(async () => {
  const Profile = mongoose.connection.collection('profiles');
  
  console.log('Fixing principal profile...');
  
  const result = await Profile.updateOne(
    { role: 'principal' },
    { $set: { department: null, departmentName: null } }
  );
  
  console.log('Updated:', result.modifiedCount, 'profile(s)');
  
  const principal = await Profile.findOne({ role: 'principal' });
  console.log('\nPrincipal profile:', {
    name: principal.fullName || principal.full_name,
    role: principal.role,
    department: principal.department,
    departmentName: principal.departmentName
  });
  
  await mongoose.disconnect();
}).catch(err => console.error('Error:', err));
