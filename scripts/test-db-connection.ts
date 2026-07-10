import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env.local explicitly since dotenv doesn't do it by default
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

async function testConnection() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  // Ensure database name is in the URI if it's missing (it should be between .net/ and ?)
  let finalUri = uri;
  if (!uri.includes('/wanderway')) {
      finalUri = uri.replace(/\/\?/, '/wanderway?');
      if (finalUri === uri && !uri.includes('?')) {
          finalUri = uri + '/wanderway';
      }
  }

  console.log('🔄 Attempting to connect to MongoDB Atlas...');
  
  try {
    const conn = await mongoose.connect(finalUri);
    console.log('\n✅ Connected to MongoDB Atlas successfully!');
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`📍 Host: ${conn.connection.host}`);
    
    // Ping the database to be absolutely sure
    await mongoose.connection.db?.admin().ping();
    console.log('🏓 Ping: OK\n');
    
    console.log('✅ Connection test passed. You are ready for the next stage.');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed:');
    console.error(error);
    process.exit(1);
  }
}

testConnection();
