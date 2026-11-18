const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resume_ranker';

  try {
    // Attempt connecting to configured URI
    console.log(`[Database] Attempting connection to MongoDB: ${uri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('[Database] MongoDB connected successfully.');
  } catch (err) {
    console.warn(`[Database] Could not connect to external MongoDB (${err.message}). Initializing embedded MongoMemoryServer fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memUri = mongodInstance.getUri();
      await mongoose.connect(memUri);
      console.log(`[Database] Embedded MongoMemoryServer started successfully at ${memUri}`);
    } catch (memErr) {
      console.error('[Database] Fatal: Failed to initialize in-memory database:', memErr.message);
      throw memErr;
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};

module.exports = { connectDB, disconnectDB };
