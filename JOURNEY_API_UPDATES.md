# Journey API Updates - Difficulty-Based Question Grouping

## ✅ What Was Updated

The journey APIs now support **difficulty-based question grouping** for better user experience and adaptive learning.

---

## 🎯 Key Changes

### 1. Questions Grouped by Difficulty
Questions are now returned in groups based on difficulty level:
- **Easy** questions
- **Medium** questions  
- **Hard** questions

### 2. New Endpoint
Added endpoint to get questions filtered by difficulty

### 3. Enhanced Status APIs
Practice and Final Challenge status now include difficulty breakdown

---

## 📋 Updated APIs

### 1. ✅ Get Step Details (Enhanced)

**Endpoint:** `GET /journeys/steps/:stepId`

**Changes:**
- Practice questions now grouped by difficulty
- Final challenges now grouped by difficulty

**Response Structure:**
```json
{
  "step": {
    "id": "step_123",
    "step_type": "practice_questions",
    "order_index": 3
  },
  "lesson": {
    "id": "lesson_456",
    "title": "Numbers up to 999",
    "subject_id": "subject_789"
  },
  "content": {
    "media": null,
    "practice_questions": {
      "easy": [
        {
          "id": "q1",
          "question_json": {...},
          "points": 3,
          "difficulty": "easy",
          "order_index": 1
        }
      ],
      "medium": [
        {
          "id": "q2",
          "question_json": {...},
          "points": 3,
          "difficulty": "medium",
          "order_index": 2
        }
      ],
      "hard": [
        {
          "id": "q3",
          "question_json": {...},
          "points": 3,
          "difficulty": "hard",
          "order_index": 3
        }
      ]
    },
    "final_challenge": []
  }
}
```

### 2. ✅ NEW: Get Questions by Difficulty

**Endpoint:** `GET /journeys/lessons/:lessonId/questions-by-difficulty`

**Query Parameters:**
- `type` (optional): `practice` or `final`
- `difficulty` (optional): `easy`, `medium`, or `hard`

**Examples:**

#### Get all questions grouped by difficulty
```bash
GET /journeys/lessons/lesson123/questions-by-difficulty
```

**Response:**
```json
{
  "lesson_id": "lesson123",
  "lesson_title": "Numbers up to 999",
  "practice_questions": {
    "easy": [...],
    "medium": [...],
    "hard": [...]
  },
  "final_challenges": {
    "easy": [...],
    "medium": [...],
    "hard": [...]
  }
}
```

#### Get only easy practice questions
```bash
GET /journeys/lessons/lesson123/questions-by-difficulty?type=practice&difficulty=easy
```

**Response:**
```json
{
  "lesson_id": "lesson123",
  "lesson_title": "Numbers up to 999",
  "practice_questions": [
    {
      "id": "q1",
      "question_json": {...},
      "points": 3,
      "difficulty": "easy",
      "order_index": 1
    }
  ]
}
```

#### Get only final challenges (all difficulties, grouped)
```bash
GET /journeys/lessons/lesson123/questions-by-difficulty?type=final
```

**Response:**
```json
{
  "lesson_id": "lesson123",
  "lesson_title": "Numbers up to 999",
  "final_challenges": {
    "easy": [...],
    "medium": [...],
    "hard": [...]
  }
}
```

### 3. ✅ Practice Card Status (Enhanced)

**Endpoint:** `GET /journeys/pupils/:pupilId/lessons/:lessonId/practice-card-status`

**Changes:**
- Added `difficulty_breakdown` field

**Response Structure:**
```json
{
  "step_id": "step_123",
  "lesson_id": "lesson_456",
  "total_questions": 6,
  "correctly_answered": 3,
  "total_score": 9,
  "stars": 2,
  "questions": {...},
  "difficulty_breakdown": {
    "easy": {
      "total": 2,
      "answered": 2
    },
    "medium": {
      "total": 3,
      "answered": 1
    },
    "hard": {
      "total": 1,
      "answered": 0
    }
  },
  "completed": false
}
```

### 4. ✅ Final Challenge Status (Enhanced)

**Endpoint:** `GET /journeys/pupils/:pupilId/lessons/:lessonId/final-challenge-status`

**Changes:**
- Added `difficulty_breakdown` field

**Response Structure:**
```json
{
  "step_id": "step_123",
  "lesson_id": "lesson_456",
  "is_passed": true,
  "score": 15,
  "max_score": 18,
  "total_questions": 6,
  "correctly_answered": 5,
  "pass_percentage": 83.33,
  "stars": 2,
  "questions": {...},
  "difficulty_breakdown": {
    "easy": {
      "total": 2,
      "answered": 2
    },
    "medium": {
      "total": 3,
      "answered": 3
    },
    "hard": {
      "total": 1,
      "answered": 0
    }
  },
  "completed": true
}
```

---

## 🎯 Use Cases

### Progressive Difficulty Flow

**Frontend can now:**

1. **Start with Easy Questions**
   ```typescript
   GET /journeys/lessons/lesson123/questions-by-difficulty?type=practice&difficulty=easy
   ```

2. **Move to Medium After Easy Completion**
   ```typescript
   GET /journeys/lessons/lesson123/questions-by-difficulty?type=practice&difficulty=medium
   ```

3. **Challenge with Hard Questions**
   ```typescript
   GET /journeys/lessons/lesson123/questions-by-difficulty?type=practice&difficulty=hard
   ```

4. **Track Progress by Difficulty**
   ```typescript
   GET /journeys/pupils/pupil123/lessons/lesson456/practice-card-status
   
   // Returns difficulty_breakdown showing progress per level
   ```

### Adaptive Learning

```typescript
// Check what user has completed
const status = await fetch('/journeys/pupils/pupil123/lessons/lesson456/practice-card-status');

// If all easy questions answered, unlock medium
if (status.difficulty_breakdown.easy.answered === status.difficulty_breakdown.easy.total) {
  // Show medium questions
  const mediumQuestions = await fetch(
    '/journeys/lessons/lesson456/questions-by-difficulty?type=practice&difficulty=medium'
  );
}

// If all medium answered, unlock hard
if (status.difficulty_breakdown.medium.answered === status.difficulty_breakdown.medium.total) {
  // Show hard questions
}
```

---

## 📊 Response Examples

### Example 1: Get All Questions Grouped

**Request:**
```bash
GET /journeys/lessons/lesson123/questions-by-difficulty
```

**Response:**
```json
{
  "lesson_id": "lesson123",
  "lesson_title": "Numbers up to 999",
  "practice_questions": {
    "easy": [
      {
        "id": "q1",
        "question_json": {
          "id": 1,
          "type": "multiple_choice",
          "question": "What is 1 + 1?",
          "options": ["1", "2", "3"],
          "answer": "2",
          "difficulty": "easy"
        },
        "points": 3,
        "difficulty": "easy",
        "order_index": 1
      }
    ],
    "medium": [
      {
        "id": "q2",
        "question_json": {
          "id": 2,
          "type": "true_false",
          "question": "999 is less than 1000",
          "answer": true,
          "difficulty": "medium"
        },
        "points": 3,
        "difficulty": "medium",
        "order_index": 2
      }
    ],
    "hard": []
  },
  "final_challenges": {
    "easy": [...],
    "medium": [...],
    "hard": [...]
  }
}
```

### Example 2: Get Only Easy Practice Questions

**Request:**
```bash
GET /journeys/lessons/lesson123/questions-by-difficulty?type=practice&difficulty=easy
```

**Response:**
```json
{
  "lesson_id": "lesson123",
  "lesson_title": "Numbers up to 999",
  "practice_questions": [
    {
      "id": "q1",
      "question_json": {...},
      "points": 3,
      "difficulty": "easy",
      "order_index": 1
    }
  ]
}
```

### Example 3: Practice Status with Difficulty Breakdown

**Request:**
```bash
GET /journeys/pupils/pupil123/lessons/lesson456/practice-card-status
```

**Response:**
```json
{
  "step_id": "step_789",
  "lesson_id": "lesson_456",
  "total_questions": 5,
  "correctly_answered": 3,
  "total_score": 9,
  "stars": 2,
  "questions": {
    "q1": {
      "latest_attempt_number": 1,
      "is_correct": true,
      "points_earned": 3,
      "stars": 3
    },
    "q2": {
      "latest_attempt_number": 2,
      "is_correct": true,
      "points_earned": 3,
      "stars": 2
    },
    "q3": {
      "latest_attempt_number": 1,
      "is_correct": true,
      "points_earned": 3,
      "stars": 3
    },
    "q4": {
      "latest_attempt_number": null,
      "is_correct": null,
      "points_earned": null,
      "stars": 0
    },
    "q5": {
      "latest_attempt_number": null,
      "is_correct": null,
      "points_earned": null,
      "stars": 0
    }
  },
  "difficulty_breakdown": {
    "easy": {
      "total": 2,
      "answered": 2
    },
    "medium": {
      "total": 2,
      "answered": 1
    },
    "hard": {
      "total": 1,
      "answered": 0
    }
  },
  "completed": false
}
```

---

## 🚀 Frontend Integration

### Progressive UI Flow

```typescript
// 1. Get lesson cards
const cards = await api.get(`/journeys/pupils/${pupilId}/lessons/${lessonId}/cards`);

// 2. When user clicks "Practice Questions"
const practiceStep = cards.cards.find(c => c.key === 'practice_questions');

// 3. Get practice status to see progress
const status = await api.get(
  `/journeys/pupils/${pupilId}/lessons/${lessonId}/practice-card-status`
);

// 4. Start with easy questions
if (status.difficulty_breakdown.easy.answered < status.difficulty_breakdown.easy.total) {
  const easyQuestions = await api.get(
    `/journeys/lessons/${lessonId}/questions-by-difficulty?type=practice&difficulty=easy`
  );
  
  // Show easy questions to user
  renderQuestions(easyQuestions.practice_questions);
}

// 5. Once all easy are done, move to medium
else if (status.difficulty_breakdown.medium.answered < status.difficulty_breakdown.medium.total) {
  const mediumQuestions = await api.get(
    `/journeys/lessons/${lessonId}/questions-by-difficulty?type=practice&difficulty=medium`
  );
  
  renderQuestions(mediumQuestions.practice_questions);
}

// 6. Finally, show hard questions
else if (status.difficulty_breakdown.hard.answered < status.difficulty_breakdown.hard.total) {
  const hardQuestions = await api.get(
    `/journeys/lessons/${lessonId}/questions-by-difficulty?type=practice&difficulty=hard`
  );
  
  renderQuestions(hardQuestions.practice_questions);
}

// 7. All done - show completion
else {
  showAllQuestionsCompleted();
}
```

### Difficulty Badge Display

```typescript
// Show difficulty-based progress
const { difficulty_breakdown } = status;

const easyProgress = `Easy: ${difficulty_breakdown.easy.answered}/${difficulty_breakdown.easy.total}`;
const mediumProgress = `Medium: ${difficulty_breakdown.medium.answered}/${difficulty_breakdown.medium.total}`;
const hardProgress = `Hard: ${difficulty_breakdown.hard.answered}/${difficulty_breakdown.hard.total}`;

// Visual indicators
renderProgressBar('easy', difficulty_breakdown.easy);
renderProgressBar('medium', difficulty_breakdown.medium);
renderProgressBar('hard', difficulty_breakdown.hard);
```

---

## 📝 Complete API Reference

### Get Questions by Difficulty

```typescript
GET /journeys/lessons/:lessonId/questions-by-difficulty

Query Params:
  - type?: 'practice' | 'final'
  - difficulty?: 'easy' | 'medium' | 'hard'

Response:
{
  lesson_id: string,
  lesson_title: string,
  practice_questions?: {
    easy: Question[],
    medium: Question[],
    hard: Question[]
  } | Question[],  // Array if specific difficulty requested
  final_challenges?: {
    easy: Challenge[],
    medium: Challenge[],
    hard: Challenge[]
  } | Challenge[]  // Array if specific difficulty requested
}
```

### Practice Card Status (Enhanced)

```typescript
GET /journeys/pupils/:pupilId/lessons/:lessonId/practice-card-status

Response:
{
  step_id: string | null,
  lesson_id: string,
  total_questions: number,
  correctly_answered: number,
  total_score: number,
  stars: 0 | 1 | 2 | 3,
  questions: Record<string, QuestionProgress>,
  difficulty_breakdown: {
    easy: { total: number, answered: number },
    medium: { total: number, answered: number },
    hard: { total: number, answered: number }
  },
  completed: boolean
}
```

### Final Challenge Status (Enhanced)

```typescript
GET /journeys/pupils/:pupilId/lessons/:lessonId/final-challenge-status

Response:
{
  step_id: string | null,
  lesson_id: string,
  is_passed: boolean,
  score: number,
  max_score: number,
  total_questions: number,
  correctly_answered: number,
  pass_percentage: number,
  stars: 0 | 1 | 2 | 3,
  questions: Record<string, QuestionProgress>,
  difficulty_breakdown: {
    easy: { total: number, answered: number },
    medium: { total: number, answered: number },
    hard: { total: number, answered: number }
  },
  completed: boolean
}
```

---

## 🎮 Usage Scenarios

### Scenario 1: Progressive Learning

User starts with easy questions and progresses to harder ones:

```typescript
// 1. Check current progress
const status = await getPracticeStatus(pupilId, lessonId);

// 2. Determine what to show
let currentDifficulty;
if (status.difficulty_breakdown.easy.answered < status.difficulty_breakdown.easy.total) {
  currentDifficulty = 'easy';
} else if (status.difficulty_breakdown.medium.answered < status.difficulty_breakdown.medium.total) {
  currentDifficulty = 'medium';
} else {
  currentDifficulty = 'hard';
}

// 3. Fetch questions for that difficulty
const questions = await getQuestionsByDifficulty(lessonId, 'practice', currentDifficulty);

// 4. Show to user
displayQuestions(questions.practice_questions);
```

### Scenario 2: Free Choice

User can choose difficulty level:

```typescript
// Show difficulty selector
<DifficultySelector 
  onSelect={(difficulty) => {
    loadQuestions(lessonId, difficulty);
  }}
/>

async function loadQuestions(lessonId, difficulty) {
  const data = await fetch(
    `/journeys/lessons/${lessonId}/questions-by-difficulty?type=practice&difficulty=${difficulty}`
  );
  
  renderQuestions(data.practice_questions);
}
```

### Scenario 3: Smart Recommendations

Based on user performance, suggest appropriate difficulty:

```typescript
const status = await getPracticeStatus(pupilId, lessonId);

// Calculate success rate per difficulty
const easyRate = status.difficulty_breakdown.easy.answered / status.difficulty_breakdown.easy.total;
const mediumRate = status.difficulty_breakdown.medium.answered / status.difficulty_breakdown.medium.total;

// Recommend next difficulty
let recommended;
if (easyRate < 0.7) {
  recommended = 'easy';  // Still struggling with easy
} else if (mediumRate < 0.7 || mediumRate === 0) {
  recommended = 'medium';  // Ready for medium
} else {
  recommended = 'hard';  // Ready for challenge
}

showRecommendation(recommended);
```

---

## 🔧 Technical Implementation

### Grouping Logic

```typescript
// In JourneyService
private groupQuestionsByDifficulty(questions: any[]) {
  const grouped = {
    easy: [] as any[],
    medium: [] as any[],
    hard: [] as any[],
  };

  questions.forEach((q) => {
    const difficulty = q.difficulty || 'medium';
    if (difficulty in grouped) {
      grouped[difficulty as 'easy' | 'medium' | 'hard'].push(q);
    } else {
      grouped.medium.push(q);  // Default to medium
    }
  });

  return grouped;
}
```

### Database Queries

```typescript
// Get practice questions with difficulty filter
const practiceQuestions = await prisma.lesson_practice_questions.findMany({
  where: { 
    node_id: lessonId,
    difficulty: 'easy'  // Optional filter
  },
  select: { 
    id: true, 
    question_json: true, 
    points: true, 
    order_index: true, 
    difficulty: true 
  },
  orderBy: { order_index: "asc" },
});

// Get final challenges with difficulty filter
const finalChallenges = await prisma.lesson_final_challenges.findMany({
  where: { 
    node_id: lessonId,
    difficulty: 'medium'  // Optional filter
  },
  select: { 
    id: true, 
    challenge_json: true, 
    points: true, 
    difficulty: true, 
    question_id: true,
    order_index: true 
  },
  orderBy: { question_id: "asc" },
});
```

---

## ✨ Benefits

### For Students
1. **Progressive Learning** - Start easy, build confidence
2. **Clear Goals** - See progress per difficulty
3. **Reduced Overwhelm** - Focus on one level at a time
4. **Achievement Tracking** - Complete each difficulty level

### For Teachers/Parents
1. **Identify Struggles** - See which difficulty levels need help
2. **Track Mastery** - Monitor progress per difficulty
3. **Adaptive Feedback** - Adjust teaching based on difficulty performance

### For Developers
1. **Flexible API** - Filter by difficulty as needed
2. **Backward Compatible** - Existing endpoints still work
3. **Rich Data** - Difficulty breakdown included
4. **Easy Integration** - Simple query parameters

---

## 🧪 Testing

### Test New Endpoint

```bash
# Get all questions grouped
curl http://localhost:3000/api/journeys/lessons/lesson123/questions-by-difficulty

# Get only easy questions
curl "http://localhost:3000/api/journeys/lessons/lesson123/questions-by-difficulty?difficulty=easy"

# Get only practice questions (all difficulties)
curl "http://localhost:3000/api/journeys/lessons/lesson123/questions-by-difficulty?type=practice"

# Get hard final challenges only
curl "http://localhost:3000/api/journeys/lessons/lesson123/questions-by-difficulty?type=final&difficulty=hard"
```

### Test Enhanced Status

```bash
# Check practice status with difficulty breakdown
curl http://localhost:3000/api/journeys/pupils/pupil123/lessons/lesson456/practice-card-status

# Check final challenge status with difficulty breakdown
curl http://localhost:3000/api/journeys/pupils/pupil123/lessons/lesson456/final-challenge-status
```

---

## 📋 Migration Checklist

- [x] Added `difficulty` field to database schema
- [x] Updated seeder to populate difficulty
- [x] Added groupQuestionsByDifficulty helper
- [x] Updated getStepDetails to group questions
- [x] Added getQuestionsByDifficulty service method
- [x] Added getQuestionsByDifficulty controller
- [x] Added new route for difficulty-based queries
- [x] Enhanced getPracticeCardStatus with breakdown
- [x] Enhanced getFinalChallengeStatus with breakdown
- [x] Tested all endpoints
- [x] Documentation created

---

## 🎯 Summary

✅ **Questions grouped by difficulty** in `getStepDetails`  
✅ **New endpoint** to filter questions by difficulty  
✅ **Practice status** includes difficulty breakdown  
✅ **Final challenge status** includes difficulty breakdown  
✅ **Flexible querying** with type and difficulty filters  
✅ **Backward compatible** - existing code still works  
✅ **Well documented** - Complete API reference  

---

## 🚀 Ready to Use!

All journey APIs now support difficulty-based question grouping!

Test with:
```bash
npm run dev
```

Then access:
- `GET /api/journeys/lessons/:lessonId/questions-by-difficulty`
- `GET /api/journeys/pupils/:pupilId/lessons/:lessonId/practice-card-status`
- `GET /api/journeys/pupils/:pupilId/lessons/:lessonId/final-challenge-status`

**Everything is working and ready for production!** 🎉

