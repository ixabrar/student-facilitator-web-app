// Fix department data inconsistency
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/student-webapp';

async function fixDepartments() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const profiles = mongoose.connection.db.collection('profiles');
    const departments = mongoose.connection.db.collection('departments');

    // Get all departments
    const depts = await departments.find().toArray();
    console.log('📋 Departments:');
    depts.forEach(d => console.log(`   ${d._id} -> ${d.name}`));

    // Find profiles with string departments
    const badProfiles = await profiles.find({ 
      department: { $type: 'string' } 
    }).toArray();

    console.log(`\n⚠️  Found ${badProfiles.length} profiles with string departments\n`);

    let fixed = 0;
    for (const profile of badProfiles) {
      // Find matching department by name
      const dept = depts.find(d => 
        d.name.toLowerCase() === profile.department.toLowerCase() ||
        d.abbreviation?.toLowerCase() === profile.department.toLowerCase()
      );

      if (dept) {
        await profiles.updateOne(
          { _id: profile._id },
          { 
            $set: { 
              department: dept._id,
              departmentName: dept.name 
            } 
          }
        );
        console.log(`✅ Fixed: ${profile.fullName} -> ${dept.name} (${dept._id})`);
        fixed++;
      } else {
        console.log(`❌ No match: ${profile.fullName} has dept "${profile.department}"`);
      }
    }

    console.log(`\n📊 Summary: Fixed ${fixed}/${badProfiles.length} profiles`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected');
  }
}

fixDepartments();
