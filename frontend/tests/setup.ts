import 'dotenv/config'; // Make sure env vars are loaded

// Tests call the Next.js dev server spawned by globalSetup on port 3005
process.env.TEST_API_BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3005/api/v1';
