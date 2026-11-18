require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Auto-seed default demo account and sample jobs/candidates
    try {
      const User = require('./models/User');
      const { seedDemoDataForUser } = require('./utils/demoData');
      let demoUser = await User.findOne({ email: 'recruiter@techcorp.com' });
      if (!demoUser) {
        demoUser = await User.create({
          name: 'Demo Recruiter',
          email: 'recruiter@techcorp.com',
          password: 'Password@123',
          company: 'TechCorp Talent Team',
          role: 'recruiter',
        });
        console.log('[Demo] Created default demo recruiter: recruiter@techcorp.com');
      }
      await seedDemoDataForUser(demoUser._id, { force: false, shortlistThreshold: 80 });
      console.log('[Demo] Initialized demo jobs & candidates (80% shortlist threshold configured).');
    } catch (demoErr) {
      console.warn('[Demo] Note on demo initialization:', demoErr.message);
    }

    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`[Backend Server] Running on http://localhost:${PORT}`);
      console.log(`[Backend Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown handling
    const shutdown = async () => {
      console.log('[Backend Server] Gracefully shutting down...');
      server.close(() => {
        console.log('[Backend Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('[Backend Server] Failed to start:', err.message);
    process.exit(1);
  }
};

startServer();
