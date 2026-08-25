# QuickHireAI — Scholastic Aptitude & Coding Practice Platform

## Executive Overview
The **Scholastic Aptitude & Coding Practice Platform** is a major new production-quality module seamlessly integrated into QuickHireAI. It transforms the existing AI-driven interview preparation suite into a complete university and enterprise placement ecosystem.

---

## 🏛️ Architecture & Folder Structure

### 1. Backend Module (`Backend/src/features/scholastic/`)
The backend is completely modularized inside `src/features/scholastic/` to preserve zero-regression compatibility with existing authentication and interview services:
- **`models/` (18 Mongoose Schemas)**:
  - **Aptitude**: `AptitudeCategory`, `AptitudeQuestion`, `AptitudeAttempt`
  - **Coding**: `CodingTopic`, `CodingQuestion`, `CodingTestCase`, `CodingSubmission`
  - **Mock Tests**: `MockTest`, `MockAttempt`, `PlacementCompany`, `BookmarkedQuestion`
  - **Gamification & Stats**: `ScholasticProgress`, `ScholasticLeaderboard`, `Contest`, `ContestRegistration`, `DailyChallenge`, `Badge`, `Achievement`
- **`controllers/`**:
  - `aptitudeController.js`: Topic/difficulty filtering, search, MCQ evaluation, accuracy tracking, bookmarks.
  - `codingController.js`: Multi-language code runner (`/run`), submission evaluator (`/submit`), testcase result breakdowns.
  - `scholasticController.js`: User statistics, streak calculation, XP awards, 4-week activity heatmap, contest registration, leaderboard rankings.
  - `adminController.js`: Administrative CRUD and bulk question import for university placement officers.
- **`services/`**:
  - `CodeExecutionService.js`: Hybrid sandbox engine supporting **Judge0 API** integration and safe local fallback execution for Node.js (`javascript`) and Python 3 (`python`).
- **`utils/`**:
  - `XPCalculator.js`: Dynamic gamification engine calculating XP, coins, streak multipliers, level progression, and automatic badge unlocks.
- **Seeding**:
  - `Backend/src/scripts/seedScholastic.js`: Seeding script populating 100+ placement aptitude questions, FAANG-level coding problems, placement companies (**TCS NQT, Infosys, Wipro, Google, Amazon, Microsoft, Accenture**), badges, and mock tests.

---

### 2. Frontend Module (`Frontend/src/features/scholastic/`)
The frontend uses modern, rich UI/UX aesthetics (glassmorphism, interactive hover states, dynamic badges, sleek dark IDE themes) and is structured as:
- **`services/`**:
  - `scholasticApi.js`: Dedicated Axios API service managing all endpoints (`/api/scholastic/*`).
- **`components/`**:
  - `ScholasticDashboard.jsx`: Hero statistics, daily streak counter, daily challenge card, practice module grid, and company focus chips.
  - `AptitudePractice.jsx`: Category and difficulty chips, search bar, accuracy display, and interactive MCQ question modal with instant answer verification and explanation.
  - `CodingPractice.jsx`: Algorithmic coding problem table with topic/difficulty filters and acceptance rates.
  - `CodingIDEModal.jsx`: Split-screen LeetCode-style IDE with problem description, editorial/hints tab, multi-language selector (`javascript`, `python`, `cpp`, `java`), custom stdin input, console output, and testcase verification.
  - `LeaderboardPage.jsx`: Podium crowns for Top 3 champions and multi-tab rankings (`Global`, `College`, `Monthly`, `Weekly`).
  - `ProgressPage.jsx`: 4-week activity heatmap, category accuracy progress bars, and unlocked badge showcase.
  - `ContestsPage.jsx`: University and national placement coding contests with countdown timers and registration.
  - `MockTestsPage.jsx`: Simulated company placement assessments for TCS NQT, Infosys, Wipro, Google, and Amazon.
  - `BookmarksPage.jsx`: Saved aptitude and coding problems for quick pre-interview revision.
  - `ProfilePage.jsx`: Academic resume, target placement companies, and competitive rating showcase.
- **`pages/`**:
  - `ScholasticMainPage.jsx`: Complete container with sticky navigation across all 9 scholastic views.
- **`styles/`**:
  - Standardized modern CSS stylesheets (`ScholasticDashboard.css`, `AptitudePractice.css`, `CodingPractice.css`, `LeaderboardPage.css`, `ProgressPage.css`, `ContestsPage.css`, `MockTestsPage.css`) providing responsive layouts and curated HSL color palettes.

---

## 🔗 Routing & Integration
- **Sidebar Integration**: Added a dedicated `SCHOLASTIC PRACTICE` collapsible menu inside `Frontend/src/features/student/components/Sidebar.jsx`.
- **Dashboard Rendering**: Integrated directly into `StudentDashboard.jsx` (`activeSection.startsWith('scholastic-')`).
- **Direct App Routing**: Added standalone `<Route path="/dashboard/scholastic/*" />` to `Frontend/src/App.jsx`.
- **Server API Mounting**: Mounted all modular routes in `Backend/server.js` under `/api/scholastic/*`, `/api/aptitude`, `/api/coding`, `/api/scholastic/admin`.

---

## 🚀 Key Features & Capabilities
1. **Zero Regression**: All existing QuickHireAI authentication, AI mock interviews, scheduling, and student/company dashboards operate without modification.
2. **Instant Code Sandbox**: Solve algorithms in JavaScript or Python with real-time testcase feedback, memory/time metrics, and XP rewards.
3. **Gamified Motivation**: Daily streak protection, XP multipliers, university leaderboards, and placement badges.
4. **Company-Focused Prep**: Custom placement tests tailored to major IT and FAANG recruiters.
