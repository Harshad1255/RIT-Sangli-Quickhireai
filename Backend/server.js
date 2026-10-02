const path = require('path');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

const { validateEnv } = require('./src/config/validateEnv');
const envValidation = validateEnv(process.env);

if (!envValidation.valid) {
  console.error('[env] Startup aborted. Invalid or missing variables:', envValidation.invalidVariables.join(', '));
  process.exit(1);
}

if (envValidation.warnings.length > 0) {
  console.warn('[env] Startup configuration warnings:', envValidation.warnings.join('; '));
}

const connectDB = require('./src/config/db');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

console.log('[CodeExecution]', {
  enabled: process.env.CODE_EXECUTION_ENABLED === 'true',
  provider: process.env.CODE_EXECUTION_PROVIDER || 'judge0',
  baseUrlConfigured: Boolean(process.env.ONECOMPILER_API_URL || process.env.JUDGE0_API_URL || process.env.JUDGE0_BASE_URL),
  apiKeyConfigured: Boolean(process.env.ONECOMPILER_API_KEY || process.env.JUDGE0_API_KEY),
  hostConfigured: Boolean(process.env.JUDGE0_HOST)
});

// Now load other modules
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const interviewRoutes = require('./src/features/interviews/routes/interviewRoutes');
const userRoutes = require('./src/features/users/routes/userRoutes');
const { aptitudeRoutes, codingRoutes, scholasticRoutes, adminRoutes } = require('./src/features/scholastic/routes');
const companyScholasticRoutes = require('./src/features/scholastic/routes/companyScholasticRoutes');
const aptitudeTestRoutes = require('./src/features/aptitude/routes/aptitudeTestRoutes');
const codingProblemRoutes = require('./src/features/coding/routes/codingProblemRoutes');
const assessmentSecurityRoutes = require('./src/features/assessment/routes/assessmentSecurityRoutes');

// Connect to MongoDB
connectDB();

// Add detailed debugging
console.log('Final Environment Check:', {
  GEMINI_API_KEY_SET: !!process.env.GEMINI_API_KEY,
  MONGODB_URI_SET: !!process.env.MONGODB_URI,
  JWT_SECRET_SET: !!process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  PWD: process.cwd()
});

const app = express();
app.set('trust proxy', 1);

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
const isProd = process.env.NODE_ENV === 'production';
let allowedOrigins = [];

if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
} else {
  allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5001',
    'https://rit-sangli-quickhireai-frontend.vercel.app'
  ];
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    if (!isProd) {
      const isLocalhostOrigin = /^http:\/\/localhost:\d+$/.test(origin);
      if (isLocalhostOrigin) {
        callback(null, true);
        return;
      }
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));
// NOTE: /downloads serves ../downloads from local disk. Wait for instruction before changing.
app.use('/downloads', express.static(path.join(__dirname, '../downloads')));

// Apply multer middleware to specific routes
app.use('/api/interviews/answer', upload.single('audioBlob'));
app.use('/api/interviews/submit-all', upload.array('answer', 10));

// --- Security Middleware ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
      "script-src-attr": ["'unsafe-inline'"],
    },
  },
}));
// Rate limiting: keep a production-safe cap, but avoid blocking legitimate local login retries.
// Many dev/test flows and UI retries legitimately hit auth endpoints more than 100 times in a short window.
const isLocalDevelopment = process.env.NODE_ENV !== 'production' || process.env.RENDER === 'false';
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isLocalDevelopment ? 1000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const isLocalRequest = ['localhost', '127.0.0.1', '::1'].includes(req.hostname);
    return isLocalDevelopment && isLocalRequest;
  },
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
            <button class="return-link" onclick="window.close()" style="border: none; cursor: pointer; font-family: inherit;">Return to QuickHire AI</button>
            <p style="margin-top: 15px; font-size: 0.9em; color: #666;">(Or simply close this tab and go back to your original window)</p>
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
app.use('/api/assessment', assessmentSecurityRoutes);
app.use('/api/scholastic/company', companyScholasticRoutes);
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

// Image Uploads
const uploadRoutes = require('./src/routes/uploadRoutes');
app.use('/api/upload', uploadRoutes);

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
      if (process.env.NODE_ENV === 'production') {
        console.error(`Port ${portToTry} is in use. Exiting in production.`);
        process.exit(1);
      }
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
