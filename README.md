# Eduverse Backend

## 📚 Overview

Eduverse Backend is the server-side application powering the Eduverse interactive learning platform. Built with Node.js, it manages authentication, users, educational content, levels, units, lessons, quizzes, student progress, achievements, subscriptions, and notifications.

The backend exposes APIs consumed by the Eduverse application and handles business logic, data validation, security, and communication with the database.

---

## 🚀 Core Features

- User authentication and authorization
- Student and parent account management
- Level, unit, and lesson management
- Learning progress tracking
- Video and educational content management
- Quiz and assessment management
- Easy, Medium, and Hard question difficulty levels
- Quiz scoring and result management
- Stars and badge reward system
- Learning streak tracking
- Achievement management
- Subscription and free-trial management
- Notifications
- Multi-language content support
- Admin content management

---

## 🛠️ Technology Stack

- **Runtime:** Node.js
- **Language:** JavaScript
- **API:** REST API
- **Package Manager:** npm
- **Authentication:** JWT
- **Database:** Database integration
- **API Testing:** Swagger / Postman
- **Version Control:** Git

---

## 🏗️ Backend Architecture

```text
Eduverse Mobile/Web Application
            │
            ▼
        REST APIs
            │
            ▼
      Node.js Backend
            │
   ┌────────┼─────────┐
   │        │         │
   ▼        ▼         ▼
  Auth    Learning   Quiz
   │        │         │
   └────────┼─────────┘
            │
            ▼
        Database
```

---

## 📂 Project Structure

```text
eduverse-backend/
│
├── src/
│   ├── config/
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── level.controller.js
│   │   ├── unit.controller.js
│   │   ├── lesson.controller.js
│   │   ├── quiz.controller.js
│   │   └── progress.controller.js
│   │
│   ├── models/
│   │   ├── user.model.js
│   │   ├── level.model.js
│   │   ├── unit.model.js
│   │   ├── lesson.model.js
│   │   ├── quiz.model.js
│   │   └── progress.model.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── level.routes.js
│   │   ├── unit.routes.js
│   │   ├── lesson.routes.js
│   │   ├── quiz.routes.js
│   │   └── progress.routes.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   └── error.middleware.js
│   │
│   ├── services/
│   │
│   ├── utils/
│   │
│   └── app.js
│
├── tests/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
└── README.md
```

---

## 📖 Learning Structure

Eduverse follows a structured learning hierarchy:

```text
Level
  │
  └── Unit
       │
       └── Lesson
            │
            ├── Introduction
            ├── Video
            ├── Learning Content
            └── Final Quiz
```

Students must complete the required lessons within a unit before progressing further.

---

## 🎥 Lesson Management

Each lesson can contain:

- Introduction content
- Educational video
- Learning materials
- Activities
- Final quiz

The backend tracks lesson completion and determines when the student can continue to the next lesson or unit.

---

## 📝 Quiz System

Each lesson can contain a final assessment.

The quiz system supports:

- Multiple-choice questions
- Easy questions
- Medium questions
- Hard questions
- Answer submission
- Automatic score calculation
- Quiz attempt tracking
- Quiz result history

A lesson quiz can contain up to **15 questions**, depending on the configured learning content.

---

## 📊 Progress Management

The backend tracks each student's learning journey.

Progress information can include:

- Current level
- Current unit
- Current lesson
- Completed lessons
- Completed units
- Quiz attempts
- Quiz scores
- Stars earned
- Badges earned
- Learning streak

### Progress Flow

```text
Start Level
    ↓
Start Unit
    ↓
Complete Lesson
    ↓
Complete Required Content
    ↓
Attempt Final Quiz
    ↓
Update Progress
    ↓
Award Stars / Achievements
    ↓
Unlock Next Lesson
    ↓
Complete Unit
    ↓
Unlock Next Unit / Level
```

---

## ⭐ Gamification & Achievements

Eduverse includes a reward system to increase student engagement.

The backend manages:

- Stars
- Badges
- Learning streaks
- Milestones
- Achievement history
- Weekly achievements

Examples include:

- Star achievements
- Streak achievements
- Badge Collector
- Star of the Week

---

## 🔐 Authentication

The authentication system handles:

- User registration
- User login
- JWT generation
- Protected API routes
- Password reset
- Forgot password
- Token validation
- Role-based authorization

Example protected request:

```http
Authorization: Bearer <access_token>
```

---

## 👥 User Roles

The system can support different user types:

### Student

Students can:

- Access learning content
- Watch lesson videos
- Complete lessons
- Attempt quizzes
- Track progress
- Earn stars and badges
- View achievements

### Parent

Parents can:

- Manage student access
- Manage subscriptions
- Monitor learning progress

### Admin

Admins can:

- Manage users
- Manage levels
- Manage units
- Manage lessons
- Manage quizzes
- Manage educational content
- Manage subscriptions

---

## 💳 Subscription Management

Eduverse supports subscription-based access.

Features include:

- 7-day free trial
- Subscription activation
- Subscription expiration
- Subscription status validation
- Premium content access
- Admin subscription management

---

## 🌍 Multi-Language Support

Eduverse supports multilingual educational content.

Supported languages include:

- Arabic
- French

The backend is designed so additional languages can be introduced as the platform expands.

---

## 🔔 Notifications

The backend can generate notifications for events such as:

- New learning content
- Lesson completion
- Quiz results
- Achievement unlocked
- Badge earned
- Learning streak
- Subscription updates

---

## 🔐 Security

Backend security includes:

- JWT authentication
- Password hashing
- Protected routes
- Role-based access control
- Request validation
- Environment variable management
- Centralized error handling
- Secure database operations

---

# ⚙️ Getting Started

## Prerequisites

Make sure the following are installed:

```text
Node.js >= 18
npm >= 9
Git
```

Check your versions:

```bash
node --version
npm --version
git --version
```

---

## Clone Repository

```bash
git clone <repository-url>
cd eduverse-backend
```

---

## Install Dependencies

```bash
npm install
```

---

## Environment Variables

Create a `.env` file in the root directory.

Example:

```env
NODE_ENV=development

PORT=3000

DATABASE_URL=

JWT_SECRET=
JWT_EXPIRES_IN=1d

REFRESH_TOKEN_SECRET=

APP_URL=
FRONTEND_URL=
```

Do not commit the `.env` file to the repository.

---

## Run Development Server

```bash
npm run dev
```

The backend should be available at:

```text
http://localhost:3000
```

---

## Run Production Server

```bash
npm start
```

---

## 📡 API Structure

Example API structure:

```text
/api/auth
/api/users
/api/levels
/api/units
/api/lessons
/api/quizzes
/api/progress
/api/achievements
/api/subscriptions
/api/notifications
```

---

## Example Endpoints

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

### Levels

```http
GET    /api/levels
GET    /api/levels/:id
POST   /api/levels
PUT    /api/levels/:id
DELETE /api/levels/:id
```

### Units

```http
GET    /api/units
GET    /api/units/:id
POST   /api/units
PUT    /api/units/:id
DELETE /api/units/:id
```

### Lessons

```http
GET    /api/lessons
GET    /api/lessons/:id
POST   /api/lessons
PUT    /api/lessons/:id
DELETE /api/lessons/:id
```

### Quizzes

```http
GET  /api/quizzes/:id
POST /api/quizzes/:id/submit
```

### Progress

```http
GET /api/progress
GET /api/progress/:userId
POST /api/progress/lesson/:lessonId/complete
```

---

## 🧪 Testing

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

---

## 📦 Build & Deployment

Recommended deployment workflow:

```text
Developer Push
      ↓
Git Repository
      ↓
CI/CD Pipeline
      ↓
Install Dependencies
      ↓
Run Tests
      ↓
Build Application
      ↓
Deploy Backend
      ↓
Health Check
```

---

## 🌱 Development Workflow

Create a new branch:

```bash
git checkout -b feature/feature-name
```

Make your changes and commit:

```bash
git add .
git commit -m "feat: add feature description"
```

Push your branch:

```bash
git push origin feature/feature-name
```

Create a Pull Request for review before merging into the main branch.

---

## 📝 Commit Convention

Recommended commit messages:

```text
feat: add new feature
fix: resolve bug
refactor: improve existing code
docs: update documentation
test: add or update tests
chore: maintenance changes
```

---

## 🚀 Future Enhancements

Future versions of Eduverse may include:

- Personalized learning recommendations
- Advanced student analytics
- Teacher management
- Classroom management
- Additional languages
- Enhanced learning recommendations

---

## 📄 License

This project is proprietary and confidential.

Unauthorized copying, modification, distribution, or use of this software is prohibited.
