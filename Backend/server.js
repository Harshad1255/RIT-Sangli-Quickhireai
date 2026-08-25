// Load environment variables first, before any other imports
const path = require('path');
const fs = require('fs');
const connectDB = require('./src/config/db');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Robust environment variable loading that works on both local and Render
const loadEnvironmentVariables = () => {
  const envPath = path.join(__dirname, '.env');
  console.log('Checking for .env file at:', envPath);
  
  if (fs.existsSync(envPath)) {
    console.log('✅ Found .env file, loading local environment variables');
    try {
  // Read and parse .env file directly
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            process.env[key.trim()] = value;
          }
        }
      }
      console.log('✅ Successfully loaded local .env file');
    } catch (error) {
      console.warn('⚠️ Error reading .env file:', error.message);
    }
  } else {
    console.log('⚠️ .env file not found. Assuming environment variables are set by hosting platform (Render)');
  }

  // Verify critical environment variables
  const requiredEnvVars = ['GEMINI_API_KEY', 'MONGODB_URI', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️ Missing environment variables:', missingVars);
    console.log('Environment check:', {
      GEMINI_API_KEY_EXISTS: !!process.env.GEMINI_API_KEY,
      MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
      JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV
    });
  } else {
    console.log('✅ All required environment variables are present');
  }
};

// Load environment variables
loadEnvironmentVariables();

// Now load other modules
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const interviewRoutes = require('./src/features/interviews/routes/interviewRoutes');
const userRoutes = require('./src/features/users/routes/userRoutes');
const { aptitudeRoutes, codingRoutes, scholasticRoutes, adminRoutes } = require('./src/features/scholastic/routes');
const aptitudeTestRoutes = require('./src/features/aptitude/routes/aptitudeTestRoutes');
const codingProblemRoutes = require('./src/features/coding/routes/codingProblemRoutes');

// Connect to MongoDB
connectDB();

// Add detailed debugging
console.log('Final Environment Check:', {
  GEMINI_API_KEY_EXISTS: !!process.env.GEMINI_API_KEY,
  GEMINI_API_KEY_STARTS_WITH: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 8) + '...' : 'NOT_SET',
  MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
  JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  PWD: process.cwd()
});

const app = express();
const preferredPort = Number(process.env.PORT) || 5001;
let port = preferredPort;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5001',
  'https://quick-hire-ai.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const isLocalhostOrigin = /^http:\/\/localhost:\d+$/.test(origin);
    if (isLocalhostOrigin) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));
app.use('/downloads', express.static(path.join(__dirname, '../downloads')));

// Apply multer middleware to specific routes
app.use('/api/interviews/answer', upload.single('audioBlob'));
app.use('/api/interviews/submit-all', upload.array('answer', 10));

// --- Security Middleware ---
app.use(helmet());
// Rate limiting: 100 requests per 15 minutes per IP for auth and interview endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/auth', apiLimiter);
app.use('/api/interviews', apiLimiter);

// Root endpoint for basic info and cron job compatibility
app.get('/', (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "QuickHire AI Backend API",
    version: "1.0.0",
    time: new Date().toISOString(),
    endpoints: {
      health: "/healthcheck",
      test: "/api/test",
      env: "/api/env-check"
    }
  });
});

// Health check endpoint for uptime monitoring
app.get('/healthcheck', (req, res) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    res.status(200).send(`
      <html>
        <head>
          <title>QuickHire AI Backend</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: Arial, sans-serif; background: #f8fafc; color: #222; text-align: center; padding: 60px; }
            .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; display: inline-block; padding: 32px 40px; }
            h1 { color: #2b7cff; }
            .return-link { display: inline-block; margin-top: 24px; padding: 12px 24px; background: #2b7cff; color: #fff; border-radius: 6px; text-decoration: none; font-size: 1.1em; }
            .return-link:hover { background: #1a5dcc; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Backend is awake!</h1>
            <p>You can now return to the <b>QuickHire AI</b> website.</p>
            <a class="return-link" href="https://quick-hire-ai.vercel.app/">Return to QuickHire AI</a>
          </div>
        </body>
      </html>
    `);
  } else {
  res.status(200).json({
    status: "ok",
    message: "QuickHire AI backend is healthy",
    time: new Date().toISOString()
  });
  }
});

// Routes
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Environment check endpoint for debugging
app.get('/api/env-check', (req, res) => {
  res.json({
    success: true,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '✅ loaded' : '❌ missing',
      MONGODB_URI: process.env.MONGODB_URI ? '✅ loaded' : '❌ missing',
      JWT_SECRET: process.env.JWT_SECRET ? '✅ loaded' : '❌ missing',
      PORT: process.env.PORT || 'not set'
  },
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', userRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/users', userRoutes);

// Scholastic Practice & Company Aptitude/Coding Module Routes
app.use('/api/aptitude', aptitudeTestRoutes);
app.use('/api/aptitude', aptitudeRoutes);
app.use('/api/coding', codingProblemRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/scholastic', scholasticRoutes);
app.use('/api/mocktests', scholasticRoutes);
app.use('/api/progress', scholasticRoutes);
app.use('/api/bookmarks', scholasticRoutes);
app.use('/api/leaderboard', scholasticRoutes);
app.use('/api/companies', scholasticRoutes);
app.use('/api/contests', scholasticRoutes);
app.use('/api/analytics', scholasticRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scholastic/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  
  // Handle specific error types
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      success: false,
      error: 'File Upload Error',
      message: err.message 
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      details: err.errors
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
      message: 'The provided ID is invalid'
    });
  }
  
  if (err.message.includes('Gemini')) {
    return res.status(500).json({ 
      success: false,
      error: 'AI Service Error',
      message: 'Error processing with Gemini API'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'Please login again'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token Expired',
      message: 'Please login again'
    });
  }
  
  // Default error response
  res.status(500).json({ 
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Function to start server with fallback ports
const startServer = (portToTry) => {
  app.listen(portToTry, () => {
    console.log(`Server running on http://localhost:${portToTry}`);
    port = portToTry; // Update the port variable
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = Number(portToTry) + 1;
      console.log(`Port ${portToTry} is busy, trying ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error('Server error:', err);
    }
  });
};

// Start the server with the preferred port
startServer(preferredPort);
