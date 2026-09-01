# Curriculum JSON Update - Integration & General Subjects

## ✅ What Was Added

### 1. General Subjects in curriculum.ts
All grades now have **general subjects** directly in the curriculum JSON:
- History
- Geography  
- Civic Education
- Islamic Education
- Music

### 2. Smart Seeder Logic
The seeder now **checks curriculum.ts first**:
- ✅ If integration units exist in JSON → Use them
- ✅ If general subjects exist in JSON → Use them
- ✅ If they don't exist → Generate defaults

---

## 📊 What's in curriculum.ts Now

### General Subjects (All Grades)

Each grade has 5 general subjects as flat arrays:

```typescript
"Grade_1": {
  "Arabic Language": { /* nested structure */ },
  "French": { /* nested structure */ },
  "Mathematics": [ /* flat array */ ],
  
  // NEW: General subjects added
  "History": [
    {
      title: "Introduction to History",
      audio: {...},
      video: {...},
      questions: [...],
      final_challenge: [...]
    }
  ],
  "Geography": [...],
  "Civic Education": [...],
  "Islamic Education": [...],
  "Music": [...]
}
```

### Structure for Each General Subject

```typescript
{
  "title": "Lesson Title",
  "audio": {
    "text": "Lesson audio text",
    "language": "en" | "ar",
    "voice": "Joanna" | "Zeina",
    "tts_audio_url": "https://example.com/..."
  },
  "video": {
    "video_url": "https://example.com/...",
    "skip_available_after_seconds": 5
  },
  "questions": [
    {
      "type": "multiple_choice" | "true_false",
      "question": "Question text",
      "options": ["Option 1", "Option 2", ...],  // for multiple_choice
      "answer": "Correct answer",
      "points": 3
    }
  ],
  "final_challenge": [
    {
      "type": "short_answer",
      "question": "Question text",
      "answer": "",
      "points": 5
    }
  ]
}
```

---

## 🎯 How the Seeder Works Now

### 1. Processing General Subjects

```typescript
// In transformCurriculum function:
const generalSubjects = ["History", "Geography", "Civic Education", "Islamic Education", "Music"];

for (const generalSubject of generalSubjects) {
  // Check if it exists in curriculum.ts
  if (!curriculum[grade][generalSubject]) {
    // NOT in curriculum → Generate default
    transformed[grade][generalSubject] = createGeneralSubject(generalSubject, grade);
  } else {
    // EXISTS in curriculum → Use it and process
    const existingData = curriculum[grade][generalSubject];
    transformed[grade][generalSubject] = existingData.map(processLesson);
  }
}
```

**Result:**
- ✅ Uses your custom general subjects from curriculum.ts
- ✅ Falls back to defaults if not present
- ✅ Automatically adds IDs and difficulty levels

### 2. Processing Integration Units

```typescript
// For each level in nested subjects
const hasIntegration = Object.keys(levelData).some((key) => 
  key.toLowerCase().includes("integration")
);

if (!hasIntegration) {
  // No integration in JSON → Generate default
  transformed[...]["Integrations"] = createIntegrationLesson(...);
} else {
  // Integration exists → Use it and process
  transformed[...]["Integrations"] = processExistingIntegration(...);
}
```

**Result:**
- ✅ Uses your custom integrations from curriculum.ts
- ✅ Falls back to generated ones if not present
- ✅ Processes existing integrations (adds IDs, difficulty)

---

## 📝 Examples

### Example 1: Custom General Subject

Add to curriculum.ts:

```typescript
"Grade_1": {
  "History": [
    {
      "title": "My Custom History Lesson",
      "audio": {
        "text": "My custom audio content",
        "language": "en",
        "voice": "Joanna",
        "tts_audio_url": "https://my-custom-url.com/audio.mp3"
      },
      "video": {
        "video_url": "https://my-custom-url.com/video.mp4",
        "skip_available_after_seconds": 5
      },
      "questions": [
        {
          "type": "multiple_choice",
          "question": "My custom question?",
          "options": ["A", "B", "C"],
          "answer": "A",
          "points": 3
        }
      ],
      "final_challenge": [
        {
          "type": "short_answer",
          "question": "Explain your answer",
          "answer": "",
          "points": 5
        }
      ]
    }
  ]
}
```

The seeder will:
1. ✅ Detect "History" exists in curriculum.ts
2. ✅ Use your custom content
3. ✅ Add IDs to questions (automatically)
4. ✅ Add difficulty levels (automatically)
5. ✅ Process and seed to database

### Example 2: Custom Integration Unit

Add to curriculum.ts:

```typescript
"Grade_1": {
  "Arabic Language": {
    "Segment_01": {
      "Unit_01": { /* lessons */ },
      "Unit_02": { /* lessons */ },
      
      // Add your custom integration
      "Integrations": {
        "Integration Lesson": {
          "title": "My Custom Integration",
          "audio": {...},
          "video": {...},
          "questions": [],
          "final_challenge": [
            {
              "type": "writing_assessment",
              "writing_task": {
                "type": "Written Production",
                "difficulty": "Medium",
                "points": 10,
                "context": "Your custom context",
                "instruction": "Your custom instruction",
                "requirements": ["Req 1", "Req 2"],
                "length": "6 lines"
              },
              "self_correction_grid": {
                "title": "Your Rubric",
                "total_points": 10,
                "note_for_parent": "Your note",
                "criteria": [...]
              }
            }
          ],
          "payload": {
            "is_integration_lesson": true,
            "integration_type": "writing"
          }
        }
      }
    }
  }
}
```

The seeder will:
1. ✅ Detect "Integrations" exists
2. ✅ Use your custom integration
3. ✅ Add IDs to final_challenge (automatically)
4. ✅ Process and seed to database

---

## 🎨 Current Curriculum Content

### Grade 1
- **History**: Introduction to History
- **Geography**: Introduction to Geography
- **Civic Education**: Introduction to Civic Education
- **Islamic Education**: مقدمة في التربية الإسلامية
- **Music**: Introduction to Music

### Grade 2
- **History**: History of Our Community
- **Geography**: Our Country and Neighbors
- **Civic Education**: Rights and Responsibilities
- **Islamic Education**: الأخلاق الإسلامية
- **Music**: Rhythm and Beat

### Grade 3
- **History**: Ancient Civilizations
- **Geography**: Continents and Oceans
- **Civic Education**: Community and Cooperation
- **Islamic Education**: العبادات في الإسلام
- **Music**: Musical Instruments

---

## ✨ Benefits

### 1. **Flexibility**
- Add custom general subjects in curriculum.ts
- Add custom integrations in curriculum.ts
- Seeder uses them automatically

### 2. **Consistency**
- Same structure for all subjects
- IDs and difficulty added automatically
- No need to manually add metadata

### 3. **Smart Fallback**
- Missing subjects? Seeder generates defaults
- Missing integrations? Seeder creates them
- Always have complete curriculum

### 4. **Easy Maintenance**
- All content in one place (curriculum.ts)
- Update JSON, run seeder, done!
- No separate configuration files

---

## 🚀 How to Use

### Option 1: Use Existing Content (Current)
```bash
npm run seed
```

The seeder will use the general subjects and integrations already in curriculum.ts.

### Option 2: Add Your Own Content

1. **Edit curriculum.ts**
   - Add/modify general subjects
   - Add/modify integrations

2. **Run seeder**
   ```bash
   npm run seed
   ```

3. **Verify**
   ```bash
   npm run seed:verify
   ```

### Option 3: Mix and Match

- Add some general subjects in curriculum.ts
- Let others be auto-generated
- Same for integrations

The seeder is smart enough to handle any combination!

---

## 📋 Checklist

When adding custom content to curriculum.ts:

### For General Subjects:
- ✅ Structure as flat array
- ✅ Each lesson has title, audio, video
- ✅ Include questions array
- ✅ Include final_challenge array
- ✅ Don't add IDs manually (seeder adds them)
- ✅ Don't add difficulty manually (seeder adds it)

### For Integration Units:
- ✅ Name the unit "Integrations" or include "integration" in the name
- ✅ Include "Integration Lesson" inside
- ✅ Choose type: "writing_assessment" or "ordering_assessment"
- ✅ Include writing_task or ordering_task object
- ✅ Include self_correction_grid
- ✅ Add payload with integration metadata

---

## 🎓 Summary

✅ **General subjects** added to curriculum.ts for all 3 grades  
✅ **Seeder checks JSON first** before generating defaults  
✅ **Custom content supported** - add your own in curriculum.ts  
✅ **Smart fallback** - missing content auto-generated  
✅ **IDs and difficulty** added automatically during transformation  
✅ **Tested and working** - ready to use!  

**Just run `npm run seed` and everything works!** 🎉

