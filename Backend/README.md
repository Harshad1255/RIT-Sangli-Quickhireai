# QuickHire AI Backend

A comprehensive AI-powered interview platform backend with real-time analysis, face detection, and automated evaluation.


- **AI-Powered Interviews**: Real-time question generation and answer analysis using Google Gemini
- **Face Analysis**: Confidence scoring and behavioral analysis during interviews
- **Candidate Management**: Excel upload, status tracking, and result management
- **Interview Sessions**: Dynamic question generation and progress tracking
- **Authentication**: JWT-based authentication with role-based access
- **Real-time Feedback**: Instant evaluation and scoring during interviews

## 📁 Project Structure

```
interview-backend/
├── src/
│   ├── config/
│   │   └── db.js                 # Database connection configuration
│   ├── features/
│   │   ├── auth/
│   │   │   ├── middleware/
│   │   │   │   └── auth.js       # JWT authentication middleware
│   │   │   └── index.js
│   │   ├── candidates/
│   │   │   ├── models/
│   │   │   │   └── Candidate.js  # Candidate data model
│   │   │   └── index.js
│   │   ├── interviews/
│   │   │   ├── controllers/
│   │   │   │   ├── createInterviewController.js
│   │   │   │   ├── candidateController.js
│   │   │   │   ├── questionController.js
│   │   │   │   ├── resultController.js
│   │   │   │   └── interviewController.js
│   │   │   ├── models/
│   │   │   │   └── Interview.js  # Interview data model
│   │   │   ├── routes/
│   │   │   │   └── interviewRoutes.js
│   │   │   ├── services/
│   │   │   │   ├── aiAnalysis.js
│   │   │   │   ├── faceAnalysisService.js
│   │   │   │   ├── geminiService.js
│   │   │   │   ├── questionService.js
│   │   │   │   ├── reportGenerator.js
│   │   │   │   └── voiceAnalysisService.js
│   │   │   └── index.js
│   │   └── users/
│   │       ├── models/
│   │       │   └── User.js       # User data model
│   │       ├── routes/
│   │       │   └── userRoutes.js
│   │       └── index.js
│   ├── middleware/
│   │   └── auth.js               # Authentication middleware
│   ├── utils/
│   │   └── multerConfig.js       # File upload configuration
│   └── server.js                 # Main server file
├── scripts/
│   ├── create-env.js             # Environment setup script
│   ├── test-gemini.js           # Gemini API testing
│   └── verify-gemini-key.js     # API key verification
├── .env                          # Environment variables
├── server.js                     # Server entry point
├── package.json
└── README.md
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd interview-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   node scripts/create-env.js
   ```
   
   Then edit the `.env` file with your actual values:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your_jwt_secret
   MONGODB_URI=your_mongodb_connection_string
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

- `GEMINI_API_KEY`: Google Gemini API key for AI analysis
- `JWT_SECRET`: Secret key for JWT token generation
- `MONGODB_URI`: MongoDB connection string
- `NODE_ENV`: Environment (development/production)

### Database Setup

The application uses MongoDB Atlas. Ensure your IP address is whitelisted in MongoDB Atlas Network Access settings.

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/test` - Test database connection

### Interviews
- `POST /api/interviews` - Create new interview
- `GET /api/interviews/company` - Get company interviews
- `GET /api/interviews/:id` - Get interview details
- `POST /api/interviews/start` - Start interview session
- `GET /api/interviews/:id/questions` - Get interview questions

### Candidates
- `POST /api/interviews/:id/upload-candidates` - Upload candidates (Excel)
- `PUT /api/interviews/:id/candidates/:candidateId/status` - Update candidate status
- `POST /api/interviews/validate-code` - Validate interview/candidate codes

### Analysis
- `POST /api/interviews/process-answer` - Process answer with AI
- `POST /api/interviews/analyze-face` - Analyze face data
- `POST /api/interviews/final-evaluation` - Generate final evaluation

### Results
- `POST /api/interviews/:id/candidates/:code/end` - End interview
- `GET /api/interviews/:id/results` - Get interview results
- `POST /api/interviews/submit-results` - Submit interview results

## 🧪 Testing

Run the comprehensive endpoint test:
```bash
powershell -ExecutionPolicy Bypass -File test-endpoints.ps1
```

## 🔍 Key Features

### AI Integration
- **Question Generation**: Dynamic questions based on skills and previous answers
- **Answer Analysis**: Real-time evaluation using Gemini AI
- **Final Evaluation**: Comprehensive assessment with detailed feedback

### Face Analysis
- **Confidence Scoring**: Real-time confidence level assessment
- **Behavioral Analysis**: Eye contact, posture, and engagement metrics
- **Warning Detection**: Alerts for suspicious behavior

### Candidate Management
- **Excel Upload**: Bulk candidate import with validation
- **Status Tracking**: Pending, in-progress, completed, shortlisted, rejected
- **Result Storage**: Comprehensive scoring and feedback storage

## 🏗️ Architecture

### Feature-Based Structure
The backend follows a feature-based architecture where each feature (auth, interviews, candidates, users) has its own:
- Controllers (business logic)
- Models (data structure)
- Routes (API endpoints)
- Services (external integrations)

### Separation of Concerns
- **Controllers**: Handle HTTP requests and responses
- **Services**: Manage external API calls and complex business logic
- **Models**: Define data structure and validation
- **Routes**: Define API endpoints and middleware

### Error Handling
- Comprehensive error handling with appropriate HTTP status codes
- Detailed error messages for debugging
- Graceful degradation when services are unavailable

## 🔒 Security

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- Secure file upload handling
- Environment variable protection

## 🚀 Deployment

1. Set `NODE_ENV=production` in environment variables
2. Configure production MongoDB connection
3. Set up proper JWT secret
4. Configure CORS for production domains
5. Set up proper logging and monitoring

## 📊 Performance

- Connection pooling for database
- Efficient query optimization
- Caching for frequently accessed data
- Async/await for non-blocking operations

## 🤝 Contributing

1. Follow the feature-based structure
2. Maintain separation of concerns
3. Add comprehensive error handling
4. Include proper documentation
5. Test all endpoints before submitting

## 📝 License

This project is licensed under the MIT License.
