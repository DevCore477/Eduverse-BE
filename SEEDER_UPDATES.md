# Curriculum Seeder Updates

## Overview
This document describes the major updates made to the curriculum seeder system to support enhanced features and better data management.

## What's New

### 1. Question IDs and Difficulty Levels
- **Question IDs**: All final challenge questions now have sequential IDs (1, 2, 3, etc.)
- **Difficulty Flags**: Both practice questions and final challenges now include difficulty levels:
  - `easy`: Introductory questions
  - `medium`: Standard difficulty (default)
  - `hard`: Advanced/challenging questions

### 2. Integration Units from JSON
Integration units are no longer generated statically. They are now defined in the curriculum JSON with full lesson data:
- Each integration lesson has audio and video content
- Practice questions for assessment
- Final challenge writing assessments
- Properly structured payloads for integration metadata

### 3. General Subjects Support
Added support for non-core subjects across all grade levels:
- History
- Geography
- Civic Education
- Islamic Education
- Music

Each general subject has:
- Basic lesson structure
- Questions with IDs and difficulty levels
- Audio/video content
- Proper metadata

### 4. Enhanced Seeder Features

#### Smart Duplicate Prevention
The seeder now checks if a subject already has content before adding it:
```typescript
// Checks if subject_structure exists
// Skips re-seeding if content is already present
```

#### Improved Logging
- Progress indicators for each academic year
- Subject-by-subject status updates
- Dot indicators for lessons (`.` per lesson)
- Clear success/failure messages with details

#### Error Handling
- Comprehensive error catching
- Stack traces for debugging
- Graceful failures with proper exit codes

## Database Schema Changes

### New Enum: `enum_difficulty`
```sql
CREATE TYPE "enum_difficulty" AS ENUM ('easy', 'medium', 'hard');
```

### Updated Tables

#### `lesson_practice_questions`
- Added: `difficulty` (enum_difficulty, default: 'medium')

#### `lesson_final_challenges`
- Added: `difficulty` (enum_difficulty, default: 'medium')
- Added: `question_id` (integer, nullable)
- Added: `order_index` (integer, nullable)

## File Structure

### New Files
- `src/seeders/curriculum-transformer.ts`: Transforms curriculum JSON to add IDs, difficulty, and integration units
- `src/seeders/verify-seeder.ts`: Verification script to check seeder results

### Modified Files
- `src/seeders/subjects.ts`: Updated to handle new fields and structures
- `src/seeders/curriculum.ts`: Original curriculum data (unchanged, used as source)
- `prisma/schema.prisma`: Updated with new fields and enums

### Migrations
- `20260107000000_add_difficulty_and_question_id/migration.sql`: Database schema updates

## How to Use

### Running the Seeder

1. **First Time Setup**
   ```bash
   # Apply database migrations
   npx prisma migrate deploy
   
   # Run the seeder
   npm run seed
   ```

2. **Re-running the Seeder**
   The seeder is smart about existing data:
   - It will skip subjects that already have content
   - It will only add new subjects/grades
   - No duplicate data will be created

3. **Force Re-seed** (if needed)
   ```bash
   # Clear existing curriculum data (be careful!)
   # Then run seeder again
   npm run seed
   ```

### Verifying the Seeder

Run the verification script to check the seeder results:
```bash
npx ts-node src/seeders/verify-seeder.ts
```

This will show:
- Academic years and subject counts
- Structure node statistics
- Question/challenge difficulty distribution
- Integration units
- General subjects
- Sample lesson structure

## Curriculum JSON Structure

### Question Format
```typescript
{
  "id": 1,  // Sequential ID
  "type": "multiple_choice",
  "question": "What is...?",
  "options": ["A", "B", "C"],
  "answer": "A",
  "points": 3,
  "difficulty": "easy",  // easy | medium | hard
  "hints": {
    "correct": "Great job!",
    "wrong": "Try again."
  }
}
```

### Final Challenge Format
```typescript
{
  "id": 1,  // Sequential ID
  "type": "short_answer",
  "question": "Explain...",
  "answer": "",
  "points": 5,
  "difficulty": "medium",  // easy | medium | hard
  "hints": {
    "correct": "Excellent!",
    "wrong": "Review the lesson."
  }
}
```

### Integration Unit Format
```typescript
{
  "Integrations": {
    "Integration Lesson": {
      "title": "Integration Writing Assessment",
      "audio": { /* audio content */ },
      "video": { /* video content */ },
      "questions": [],  // Practice questions if any
      "final_challenge": [
        {
          "id": 1,
          "type": "writing_assessment",
          "prompt": "Write a comprehensive response...",
          "instructions": [...],
          "rubric_points": [...],
          "difficulty": "hard"
        }
      ],
      "payload": {
        "is_integration_lesson": true,
        "integration_assessment": { /* metadata */ }
      }
    }
  }
}
```

## Transformer Logic

The `curriculum-transformer.ts` automatically:

1. **Assigns IDs**: Sequential IDs for all questions and challenges
2. **Assigns Difficulty**: Using a balanced pattern (easy, medium, medium, hard, medium)
3. **Processes Nested Structures**: Handles all curriculum formats (flat, nested, Arabic-style, French-style)
4. **Adds Integration Units**: Creates integration units with proper structure for each level
5. **Adds General Subjects**: Creates basic structure for History, Geography, etc.

## Best Practices

### Adding New Content

1. **Add to `curriculum.ts`**: Add your raw curriculum data
2. **Transformer handles the rest**: IDs and difficulty are added automatically
3. **Run seeder**: The seeder will process the new content

### Customizing Difficulty

If you want custom difficulty for specific questions, add it in `curriculum.ts`:
```typescript
{
  "type": "multiple_choice",
  "question": "...",
  "difficulty": "hard",  // Override automatic assignment
  // ... rest of question
}
```

### Customizing Integration Units

The transformer provides default integration units, but you can override by adding them directly in `curriculum.ts`:
```typescript
{
  "Level_1": {
    "Unit_1": { /* ... */ },
    "Integrations": {
      // Your custom integration structure
    }
  }
}
```

## Troubleshooting

### Issue: Duplicate Data
**Solution**: The seeder now checks for existing content. If you see duplicates from old runs:
1. Clear the specific subject's structure
2. Re-run the seeder

### Issue: Missing Difficulty Levels
**Solution**: Check that the migration was applied:
```bash
npx prisma migrate status
npx prisma migrate deploy
```

### Issue: Integration Units Not Showing
**Solution**: Make sure the curriculum transformer is being imported:
```typescript
import { curriculumJSON } from "./curriculum-transformer";
```

## Performance Considerations

The seeder now includes:
- Progress indicators (dots per lesson)
- Academic year counter
- Subject-level logging

For large curricula, expect:
- ~1-2 seconds per lesson
- ~10-30 seconds per subject
- ~2-5 minutes per grade

## API/Frontend Integration

### Fetching Questions with Difficulty
```typescript
// Questions now include difficulty field
const questions = await prisma.lesson_practice_questions.findMany({
  where: { node_id: lessonId },
  orderBy: { difficulty: 'asc' }  // Easy first
});
```

### Fetching Final Challenges with IDs
```typescript
// Challenges now have question_id and order_index
const challenges = await prisma.lesson_final_challenges.findMany({
  where: { node_id: lessonId },
  orderBy: { question_id: 'asc' }  // Sequential order
});
```

### Filtering by Difficulty
```typescript
// Get only hard questions
const hardQuestions = await prisma.lesson_practice_questions.findMany({
  where: {
    node_id: lessonId,
    difficulty: 'hard'
  }
});
```

## Future Enhancements

Potential improvements:
1. Adaptive difficulty based on user performance
2. Difficulty-based point multipliers
3. Prerequisite questions (easy → medium → hard progression)
4. Analytics on difficulty vs. success rates

## Support

For issues or questions:
1. Check the verification script output
2. Review the seeder logs
3. Check TypeScript compilation errors
4. Verify database schema is up to date

## Changelog

### Version 2.0 (January 2026)
- Added question IDs to final challenges
- Added difficulty levels to all questions
- Integration units now from JSON with full structure
- Added general subjects (History, Geography, etc.)
- Enhanced duplicate prevention
- Improved logging and error handling
- Added verification script

