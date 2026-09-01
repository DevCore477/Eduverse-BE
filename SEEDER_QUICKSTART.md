# Curriculum Seeder - Quick Start Guide

## 🎯 ONE FILE SEEDER + SMART JSON

**Everything is now in ONE file**: `src/seeders/subjects.ts`  
**Content in**: `src/seeders/curriculum.ts` (with integrations & general subjects!)  

The seeder is **smart**: It checks curriculum.ts first, then generates defaults if needed.

## 🚀 Quick Commands

```bash
# 1. Apply database migrations
npm run migrate

# 2. Run the seeder (everything in one command!)
npm run seed

# 3. Verify the seeder results
npm run seed:verify

# 4. Test the seeder (optional)
npm run seed:test
```

## 📋 What the Seeder Does

The seeder populates your database with:

✅ **Academic Years** (Grade_1, Grade_2, Grade_3)  
✅ **Core Subjects** (Arabic, French, Mathematics, Science)  
✅ **General Subjects** (History, Geography, Civic Education, Islamic Education, Music) as **flat arrays**  
✅ **Lessons** with audio, video, and practice content  
✅ **Questions** with IDs and difficulty levels (easy, medium, hard)  
✅ **Integration Units** with **TWO types**: Writing & Ordering  

## 🎯 Key Features

### 1. Single Seeder File
Everything in `subjects.ts`:
- ✅ Curriculum transformation
- ✅ Integration generation
- ✅ General subjects
- ✅ All structure types

### 2. Enhanced Integration Assessments

**Type 1: Writing Assessment**
- Detailed writing task with context
- Parent correction grid with rubrics
- Multiple criteria (Content, Language, Coherence, Presentation)

**Type 2: Ordering Assessment**
- Student arranges concepts in correct order
- Tests understanding of sequences
- Provides hints for both correct and wrong answers

Integration types **alternate**: Writing for even levels, Ordering for odd levels.

### 3. Question IDs & Difficulty
Every question has sequential ID and difficulty:
```json
{
  "id": 1,
  "type": "multiple_choice",
  "question": "What is...?",
  "difficulty": "easy"
}
```

Difficulty levels:
- 🟢 **Easy**: Introductory
- 🟡 **Medium**: Standard (default)
- 🔴 **Hard**: Advanced

### 4. Smart Duplicate Prevention
The seeder won't duplicate existing content:
```
⚠️ Subject "Arabic Language" already has content. Skipping...
```

### 5. Flexible Structure Handling
Works with ANY curriculum structure:
- Flat arrays (general subjects)
- Nested levels (Arabic Language)
- French-style sequences
- Mixed structures

## 📊 Expected Output

```
🌱 ==========================================
🌱 Starting Comprehensive Curriculum Seeding
🌱 ==========================================

⭐ [1/3] Processing Academic Year: Grade_1
   ID: abc-123, Grade: 1

  📚 Processing: Arabic Language
.................  (dots = lessons)

  📚 Processing: History
...

✅ ==========================================
✅ ALL CURRICULUM SEEDED SUCCESSFULLY!
✅ ==========================================
```

## 🔍 Verification

Run `npm run seed:verify` to see:

```
✅ Academic Years: 3
   - Grade_1 (Grade 1): 9 subjects
   - Grade_2 (Grade 2): 9 subjects
   - Grade_3 (Grade 3): 9 subjects

✅ Practice Questions by Difficulty:
   - easy: 150
   - medium: 450
   - hard: 100
   Total: 700

✅ Integration Units: 6
   - Integrations (Arabic Language)
   - Integrations (French)
   ...
```

## ⚠️ Important Notes

1. **First Run**: May take 2-5 minutes depending on curriculum size
2. **Re-runs**: Much faster (skips existing content)
3. **Database**: Ensure PostgreSQL is running
4. **Migrations**: Must be applied before seeding

## 🛠️ Troubleshooting

### "Migration not applied"
```bash
npm run migrate
```

### "Duplicate key error"
The subject code already exists. The seeder will skip it automatically.

### "Connection refused"
Check your DATABASE_URL in `.env` and ensure PostgreSQL is running.

### "TypeScript errors"
```bash
npx tsc --noEmit
```

## 📚 Full Documentation

- **Quick Start**: This file
- **Curriculum JSON Update**: `CURRICULUM_JSON_UPDATE.md` ⭐ NEW
- **Consolidated Seeder Guide**: `CONSOLIDATED_SEEDER.md`
- **Structure Update**: `STRUCTURE_UPDATE.md`
- **Full Updates**: `SEEDER_UPDATES.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`

## 🎓 Example Usage

### After Seeding, Query Questions:
```typescript
// Get easy questions for a lesson
const easyQuestions = await prisma.lesson_practice_questions.findMany({
  where: {
    node_id: lessonId,
    difficulty: 'easy'
  },
  orderBy: { order_index: 'asc' }
});

// Get final challenges with IDs
const challenges = await prisma.lesson_final_challenges.findMany({
  where: { node_id: lessonId },
  orderBy: { question_id: 'asc' }
});
```

## ✨ Next Steps

After seeding:
1. ✅ Verify the data: `npm run seed:verify`
2. 🚀 Start your API: `npm run dev`
3. 📱 Test your endpoints
4. 🎉 Build amazing features!

---

Need help? Check `SEEDER_UPDATES.md` or review the seeder code in `src/seeders/`.

