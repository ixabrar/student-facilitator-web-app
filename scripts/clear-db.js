const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-webapp';

async function clearDatabase() {
  try {
    console.log('Connecting to MongoDB:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection;
    const collections = await db.db.listCollections().toArray();
    
    console.log(`\nFound ${collections.length} collections:`);
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    console.log('\nClearing all collections...');
    
    for (const collection of collections) {
      await db.db.collection(collection.name).deleteMany({});
      console.log(`  ✓ Cleared ${collection.name}`);
    }

    console.log('\n✅ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
