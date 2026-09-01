# Consolidated Curriculum Seeder

## 🎯 Overview

**All curriculum seeding logic is now in ONE file: `src/seeders/subjects.ts`**

This single file handles:
- ✅ Curriculum transformation (IDs, difficulty levels)
- ✅ Integration units with **Writing** and **Ordering** assessments
- ✅ General subjects (flat array structure)
- ✅ All curriculum structures (nested, flat, Arabic-style, French-style)
- ✅ Smart duplicate prevention
- ✅ Enhanced error handling

## 🚀 Quick Start

```bash
# 1. Apply migrations
npm run migrate

# 2. Run the seeder (everything in one command!)
npm run seed

# 3. Verify results
npm run seed:verify
```

## 📋 What's New

### 1. **Single Seeder File**
No more multiple seeder files! Everything is consolidated in `subjects.ts`:
- Transformation logic is integrated
- No need for separate transformer file
- Simpler to maintain and debug

### 2. **Enhanced Integration Assessments**

Integration units now support **TWO types**:

#### Type 1: Writing Assessment
Detailed writing task with parent correction grid:

```typescript
{
  id: 1,
  type: "writing_assessment",
  difficulty: "hard",
  points: 10,
  writing_task: {
    type: "Written Production",
    difficulty: "Medium",
    points: 10,
    context: "Background information for the writing task...",
    instruction: "What the student should write about...",
    requirements: [
      "Requirement 1",
      "Requirement 2",
      "Use specific language features"
    ],
    length: "6-8 lines"
  },
  self_correction_grid: {
    title: "Assessment Rubric",
    total_points: 10,
    note_for_parent: "Dear parent, use this grid to evaluate...",
    criteria: [
      {
        name: "Content & Ideas",
        points: 4,
        indicators: [
          "Addresses all key concepts",
          "Provides clear examples",
          ...
        ]
      },
      {
        name: "Language Use",
        points: 3,
        indicators: [...]
      },
      ...
    ]
  }
}
```

#### Type 2: Ordering Assessment
Same structure as writing assessment, but for ordering tasks:

```typescript
{
  id: 1,
  type: "ordering_assessment",
  difficulty: "hard",
  points: 10,
  ordering_task: {
    type: "Ordering Task",
    difficulty: "Medium",
    points: 10,
    context: "Background information about the concepts...",
    instruction: "Arrange the following key concepts in their correct logical order.",
    requirements: [
      "Understand the relationship between concepts",
      "Consider cause and effect relationships",
      "Think about the natural progression of ideas",
      "Pay attention to prerequisite knowledge"
    ],
    items: [
      "First key concept",
      "Second key concept",
      "Third key concept",
      "Fourth key concept"
    ],
    correct_order: [
      "First key concept",
      "Second key concept",
      "Third key concept",
      "Fourth key concept"
    ]
  },
  self_correction_grid: {
    title: "Ordering Assessment Rubric",
    total_points: 10,
    note_for_parent: "Dear parent, use this grid to evaluate...",
    criteria: [
      {
        name: "Conceptual Understanding",
        points: 5,
        indicators: [
          "Demonstrates understanding of concept relationships",
          "Recognizes logical connections",
          "Identifies prerequisite knowledge",
          "Shows comprehension of progression"
        ]
      },
      {
        name: "Logical Reasoning",
        points: 3,
        indicators: [
          "Applies logical thinking to sequence",
          "Considers cause and effect",
          "Understands temporal or hierarchical order"
        ]
      },
      {
        name: "Accuracy",
        points: 2,
        indicators: [
          "All items placed in correct order",
          "No reversals or misplacements"
        ]
      }
    ]
  }
}
```

**Both types have the same structure** with task object and self_correction_grid!  
**Integration types alternate**: Writing for even levels, Ordering for odd levels.

### 3. **General Subjects (Flat Structure)**

General subjects are now simple flat arrays:

```typescript
{
  "Grade_1": {
    "History": [
      {
        title: "Introduction to History",
        audio: {...},
        video: {...},
        questions: [...],
        final_challenge: [...]
      },
      // More lessons...
    ],
    "Geography": [...],
    "Civic Education": [...],
    "Islamic Education": [...],
    "Music": [...]
  }
}
```

No nested levels/units - just direct lesson arrays!

### 4. **Flexible Structure Handling**

The seeder automatically handles ANY structure:

✅ **Flat arrays** (general subjects)
```javascript
subject: [lesson1, lesson2, lesson3]
```

✅ **Nested levels** (Arabic Language)
```javascript
subject: {
  Level_1: {
    Unit_01: {
      lessons: {
        reading: {...},
        writing: {...}
      }
    }
  }
}
```

✅ **French-style** (with sequence objects)
```javascript
subject: {
  Level_1: {
    Unit_01: {
      Sequence_A: {
        lessons: [lesson1, lesson2]
      }
    }
  }
}
```

✅ **Mixed structures** - any combination of the above!

## 📁 File Structure

### Main Files
- `src/seeders/subjects.ts` - **Everything is here!**
- `src/seeders/curriculum.ts` - Source data (unchanged)
- `src/seeders/index.ts` - Entry point that calls subjects.ts

### Supporting Files
- `src/seeders/verify-seeder.ts` - Verification script
- `src/seeders/test-consolidated.ts` - Test script

### Removed Files
- ~~`curriculum-transformer.ts`~~ - Logic moved to subjects.ts
- ~~`test-transformer.ts`~~ - Replaced with test-consolidated.ts

## 🔧 How It Works

### 1. Transformation (Automatic)
When subjects.ts loads, it automatically:

```typescript
// Read original curriculum
import { curriculumJSON as originalCurriculum } from "./curriculum";

// Transform it (add IDs, difficulty, integrations, etc.)
const curriculumJSON = transformCurriculum(originalCurriculum);

// Use transformed version in seeder
export async function seedFullCurriculum() {
  for (const [grade, subjects] of Object.entries(curriculumJSON)) {
    // Process transformed curriculum...
  }
}
```

### 2. Integration Generation
For each level, the seeder adds an integration unit:

```typescript
// Alternate between types
const integrationType = levelIndex % 2 === 0 ? "writing" : "ordering";

// Create integration lesson
const integrationLesson = createIntegrationLesson(
  levelName, 
  subjectName, 
  gradeName, 
  integrationType
);
```

### 3. Structure Detection
The seeder automatically detects structure type:

```typescript
if (Array.isArray(subjectData)) {
  // Handle flat array
  processFlatLessons(subjectData);
} else {
  // Handle nested structure
  processNestedStructure(subjectData);
}
```

## 🎨 Customization

### Custom Integration Assessment

Add your own integration to `curriculum.ts`:

```typescript
{
  "Segment_01": {
    // ... other units ...
    "Integrations": {
      "Integration Lesson": {
        title: "My Custom Integration",
        final_challenge: [
          {
            type: "writing_assessment",
            writing_task: {
              context: "Your context here...",
              instruction: "Your instruction...",
              requirements: ["Req 1", "Req 2"],
              length: "6 lines"
            },
            self_correction_grid: {
              title: "Custom Rubric",
              criteria: [
                {
                  name: "Content",
                  points: 5,
                  indicators: [...]
                }
              ]
            }
          }
        ]
      }
    }
  }
}
```

The seeder will use your custom integration instead of generating one!

### Custom Difficulty

Override automatic difficulty assignment:

```typescript
{
  questions: [
    {
      type: "multiple_choice",
      question: "Hard question...",
      difficulty: "hard",  // Override!
      ...
    }
  ]
}
```

### Add New General Subject

The seeder automatically adds these general subjects:
- History
- Geography
- Civic Education
- Islamic Education
- Music

To add more, modify the transformation function in subjects.ts:

```typescript
// Add this line in transformCurriculum function
transformed[gradeName]["Physical Education"] = createGeneralSubject("Physical Education", gradeName);
```

## 📊 Data Flow

```
curriculum.ts (source)
       ↓
transformCurriculum() in subjects.ts
       ↓
   - Add IDs (1, 2, 3...)
   - Add difficulty (easy, medium, hard)
   - Generate integration units (writing/ordering)
   - Add general subjects (flat arrays)
       ↓
seedFullCurriculum() in subjects.ts
       ↓
   - Detect structure type
   - Create academic years
   - Create subjects
   - Create lessons with all content
       ↓
Database (PostgreSQL)
```

## ✨ Benefits

1. **Simpler**: One file instead of multiple
2. **Faster**: No separate build/import steps
3. **Easier to debug**: All logic in one place
4. **Flexible**: Handles any curriculum structure
5. **Comprehensive**: Both writing and ordering integrations
6. **Smart**: Skips existing data automatically

## 🧪 Testing

### Test the seeder loads correctly:
```bash
npm run seed:test
```

Output:
```
✅ Seeder module loaded successfully
✅ Transformation logic integrated
✅ All functions compiled without errors
✅ Main seeder function is ready to use!
```

### Run the actual seeder:
```bash
npm run seed
```

### Verify the results:
```bash
npm run seed:verify
```

## 📝 Integration Assessment Examples

### Example 1: Writing Assessment (Arabic)

```typescript
{
  writing_task: {
    type: "Written Production",
    difficulty: "Medium",
    points: 10,
    context: "A person cannot live in isolation from others, so they interact with people and choose the best among them as companions. A true friend is a precious treasure that we must cherish.",
    instruction: "Write a letter to your favorite friend, mentioning the advantages and qualities that made them close to your heart.",
    requirements: [
      "Respect the letter format (opening, greeting, and closing)",
      "Mention the friend's good advantages and qualities",
      "Use verbal sentences (verb + subject + object)",
      "Use justification phrases (because, in order to, so that, to)"
    ],
    length: "6 lines"
  },
  self_correction_grid: {
    title: "Product Specifications Grid",
    total_points: 10,
    note_for_parent: "Dear parent, use this grid to correct your child's writing.",
    criteria: [
      {
        name: "Relevance",
        points: 4,
        indicators: [
          "Wrote a complete letter in the correct format",
          "Mentioned the friend's good advantages",
          "Addressed the topic of friendship",
          "Adhered to required length"
        ]
      },
      {
        name: "Linguistic Accuracy",
        points: 3,
        indicators: [
          "Used correct verbal sentences",
          "Properly employed justification phrases",
          "Correct spelling and punctuation"
        ]
      },
      {
        name: "Coherence",
        points: 2,
        indicators: [
          "Ideas organized and logically sequenced",
          "Sentences connected and understandable"
        ]
      },
      {
        name: "Mastery",
        points: 1,
        indicators: [
          "Clear handwriting and clean presentation"
        ]
      }
    ]
  }
}
```

### Example 2: Ordering Assessment (Science)

```typescript
{
  type: "ordering_assessment",
  difficulty: "hard",
  points: 10,
  ordering_task: {
    type: "Ordering Task",
    difficulty: "Medium",
    points: 10,
    context: "The water cycle is a continuous process that circulates water throughout Earth's ecosystems. Understanding the sequence of events is crucial.",
    instruction: "Arrange the steps of the water cycle in the correct order.",
    requirements: [
      "Understand the natural progression of water",
      "Identify the starting point of the cycle",
      "Recognize cause and effect in each step",
      "Consider the complete cycle from start to return"
    ],
    items: [
      "Water vapor condenses into clouds",
      "Water evaporates from oceans and lakes",
      "Rain falls to the ground",
      "Water flows back to oceans"
    ],
    correct_order: [
      "Water evaporates from oceans and lakes",
      "Water vapor condenses into clouds",
      "Rain falls to the ground",
      "Water flows back to oceans"
    ]
  },
  self_correction_grid: {
    title: "Water Cycle Ordering Rubric",
    total_points: 10,
    note_for_parent: "Dear parent, use this grid to evaluate your child's understanding of the water cycle sequence.",
    criteria: [
      {
        name: "Scientific Understanding",
        points: 5,
        indicators: [
          "Correctly identifies the starting point of evaporation",
          "Understands the condensation process",
          "Recognizes the precipitation stage",
          "Completes the cycle with water return"
        ]
      },
      {
        name: "Sequential Logic",
        points: 3,
        indicators: [
          "Places events in natural order",
          "Shows understanding of cause and effect",
          "Demonstrates cyclical thinking"
        ]
      },
      {
        name: "Accuracy",
        points: 2,
        indicators: [
          "All four steps in perfect order",
          "No confusion between similar steps"
        ]
      }
    ]
  }
}
```

## 🎯 Best Practices

### 1. Keep curriculum.ts Clean
The source data in `curriculum.ts` should stay simple:
- Don't manually add IDs - they're added automatically
- Don't manually add difficulty - it's calculated
- Just focus on content quality

### 2. Use Custom Integrations When Needed
For important segments, create custom integration assessments that are more specific to the content.

### 3. Test Regularly
After adding new subjects or lessons:
```bash
npm run seed:test  # Quick syntax check
npm run seed       # Full seeding
npm run seed:verify # Verify results
```

### 4. Monitor Logs
The seeder provides detailed logging:
- ⭐ Academic year processing
- 📚 Subject processing
- ⏭️ Skipping existing content
- ✅ Success messages
- ❌ Error details with stack traces

## 🔍 Troubleshooting

### Issue: "Module not found: curriculum"
**Solution**: Make sure `curriculum.ts` exists and exports `curriculumJSON`

### Issue: Integration units not appearing
**Solution**: Check that levels exist in your nested structure

### Issue: General subjects missing
**Solution**: They're added automatically - verify with `npm run seed:verify`

### Issue: Duplicate data
**Solution**: The seeder skips existing subjects automatically. If you see duplicates from old runs, they were seeded before the skip logic was added.

## 🎉 Summary

You now have:
- ✅ **Single seeder file** (`subjects.ts`) - everything in one place
- ✅ **Two integration types** - writing and ordering
- ✅ **Enhanced assessment structure** - with detailed rubrics
- ✅ **Flexible structure handling** - works with any format
- ✅ **General subjects** - as simple flat arrays
- ✅ **Smart duplicate prevention** - won't re-add existing data

Just run `npm run seed` and everything works! 🚀

