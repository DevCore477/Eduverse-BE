const fs = require('fs');
const path = require('path');

// Read the curriculum file
const curriculumPath = path.join(__dirname, '../src/seeders/curriculum.ts');
const curriculumContent = fs.readFileSync(curriculumPath, 'utf8');

// Extract the JSON object
const jsonMatch = curriculumContent.match(/export const curriculumJSON = ({[\s\S]*});/);
if (!jsonMatch) {
    console.error('Could not find curriculumJSON in file');
    process.exit(1);
}

// Parse the JSON (using eval since it's not strict JSON)
const curriculumJSON = eval('(' + jsonMatch[1] + ')');

// Helper function to assign difficulty
function assignDifficulty(index, total) {
    if (total === 1) return "medium";
    if (total === 2) return index === 0 ? "easy" : "medium";
    const pattern = ["easy", "medium", "medium", "hard", "medium"];
    return pattern[index % pattern.length];
}

// Helper function to process questions array
function addIdsToQuestions(questions) {
    if (!questions || !Array.isArray(questions)) return questions;
    return questions.map((q, index) => ({
        id: index + 1,
        difficulty: q.difficulty || assignDifficulty(index, questions.length),
        ...q
    }));
}

// Helper function to process final_challenge array
function addIdsToFinalChallenges(challenges) {
    if (!challenges || !Array.isArray(challenges)) return challenges;
    return challenges.map((c, index) => ({
        id: index + 1,
        difficulty: c.difficulty || assignDifficulty(index, challenges.length),
        ...c
    }));
}

// Helper function to create integration unit
function createIntegrationUnit(segmentName, subjectName, grade, type = "writing") {
    const isArabic = subjectName === "Arabic Language";
    const language = isArabic ? "ar" : "en";
    const voice = isArabic ? "Zeina" : "Joanna";
    
    if (type === "writing") {
        return {
            "Integration Lesson": {
                "title": isArabic ? `تقييم تكاملي: ${segmentName}` : `Integration Assessment: ${segmentName}`,
                "audio": {
                    "text": isArabic 
                        ? `هذا التقييم التكاملي يختبر فهمك الشامل لجميع مواضيع ${segmentName}.`
                        : `This integration assessment tests your comprehensive understanding of all topics in ${segmentName}.`,
                    "language": language,
                    "voice": voice,
                    "tts_audio_url": `https://example.com/${grade}/${subjectName.toLowerCase().replace(/ /g, '_')}/${segmentName}/integration/audio.mp3`
                },
                "video": {
                    "url": `https://example.com/${grade}/${subjectName.toLowerCase().replace(/ /g, '_')}/${segmentName}/integration/video.mp4`,
                    "skipAfterSeconds": 10
                },
                "questions": [],
                "final_challenge": [
                    {
                        "id": 1,
                        "type": "writing_assessment",
                        "difficulty": "hard",
                        "writing_task": {
                            "type": "Written Production",
                            "difficulty": "Medium",
                            "points": 10,
                            "context": isArabic
                                ? `لقد أتممت دراسة ${segmentName}. حان الوقت لإظهار فهمك الشامل.`
                                : `You have completed ${segmentName}. Now it's time to demonstrate your comprehensive understanding.`,
                            "instruction": isArabic
                                ? `اكتب رسالة أو نصاً يجمع المفاهيم الرئيسية التي تعلمتها في ${segmentName}.`
                                : `Write a comprehensive response integrating the main concepts you learned in ${segmentName}.`,
                            "requirements": isArabic ? [
                                "احترم البنية المطلوبة للنص",
                                "اذكر المفاهيم الأساسية المتعلمة",
                                "استخدم أمثلة محددة من الدروس",
                                "استخدم جملاً واضحة ومترابطة"
                            ] : [
                                "Summarize the key concepts learned",
                                "Provide specific examples from lessons",
                                "Explain how different topics connect",
                                "Use proper grammar and sentence structure"
                            ],
                            "length": "6 lines"
                        },
                        "self_correction_grid": {
                            "title": isArabic ? "شبكة التصحيح" : "Assessment Rubric",
                            "total_points": 10,
                            "note_for_parent": isArabic 
                                ? "عزيزي ولي الأمر، استخدم هذه الشبكة لتقييم عمل طفلك."
                                : "Dear parent, use this grid to evaluate your child's work.",
                            "criteria": [
                                {
                                    "name": isArabic ? "الملاءمة" : "Content & Ideas",
                                    "points": 4,
                                    "indicators": isArabic ? [
                                        "تناول جميع المفاهيم الرئيسية",
                                        "قدم أمثلة واضحة وذات صلة",
                                        "أظهر فهماً للروابط بين المواضيع",
                                        "التزم بالطول المطلوب"
                                    ] : [
                                        "Addresses all key concepts",
                                        "Provides clear and relevant examples",
                                        "Shows understanding of topic connections",
                                        "Meets required length"
                                    ]
                                },
                                {
                                    "name": isArabic ? "الدقة اللغوية" : "Language Use",
                                    "points": 3,
                                    "indicators": isArabic ? [
                                        "استخدم قواعد لغوية صحيحة",
                                        "مفردات مناسبة للموضوع",
                                        "إملاء وترقيم صحيح"
                                    ] : [
                                        "Uses proper grammar",
                                        "Appropriate vocabulary",
                                        "Correct spelling and punctuation"
                                    ]
                                },
                                {
                                    "name": isArabic ? "الانسجام" : "Organization",
                                    "points": 2,
                                    "indicators": isArabic ? [
                                        "الأفكار منظمة منطقياً",
                                        "الجمل مترابطة ومفهومة"
                                    ] : [
                                        "Ideas logically organized",
                                        "Clear transitions"
                                    ]
                                },
                                {
                                    "name": isArabic ? "الإتقان" : "Presentation",
                                    "points": 1,
                                    "indicators": isArabic ? [
                                        "الخط واضح والعمل نظيف"
                                    ] : [
                                        "Neat presentation"
                                    ]
                                }
                            ]
                        }
                    }
                ],
                "payload": {
                    "is_integration_lesson": true,
                    "integration_type": "writing"
                }
            }
        };
    } else {
        return {
            "Integration Lesson": {
                "title": isArabic ? `تقييم تكاملي: ${segmentName}` : `Integration Assessment: ${segmentName}`,
                "audio": {
                    "text": isArabic 
                        ? `في هذا التقييم، ستقوم بترتيب المفاهيم من ${segmentName} بالترتيب الصحيح.`
                        : `In this assessment, you will arrange concepts from ${segmentName} in correct order.`,
                    "language": language,
                    "voice": voice,
                    "tts_audio_url": `https://example.com/${grade}/${subjectName.toLowerCase().replace(/ /g, '_')}/${segmentName}/integration/audio.mp3`
                },
                "video": {
                    "url": `https://example.com/${grade}/${subjectName.toLowerCase().replace(/ /g, '_')}/${segmentName}/integration/video.mp4`,
                    "skipAfterSeconds": 10
                },
                "questions": [],
                "final_challenge": [
                    {
                        "id": 1,
                        "type": "ordering_assessment",
                        "difficulty": "hard",
                        "ordering_task": {
                            "type": "Ordering Task",
                            "difficulty": "Medium",
                            "points": 10,
                            "context": isArabic
                                ? `لقد تعلمت العديد من المفاهيم في ${segmentName}. الآن رتبها بالتسلسل الصحيح.`
                                : `You've learned many concepts in ${segmentName}. Now arrange them in the correct sequence.`,
                            "instruction": isArabic
                                ? `رتب المفاهيم التالية بالترتيب المنطقي الصحيح.`
                                : `Arrange the following concepts in their correct logical order.`,
                            "requirements": isArabic ? [
                                "فهم العلاقة بين المفاهيم",
                                "مراعاة السبب والنتيجة",
                                "التفكير في التسلسل الطبيعي",
                                "الانتباه للمعرفة المسبقة"
                            ] : [
                                "Understand concept relationships",
                                "Consider cause and effect",
                                "Think about natural progression",
                                "Pay attention to prerequisite knowledge"
                            ],
                            "items": [
                                `${segmentName} - Concept 1`,
                                `${segmentName} - Concept 2`,
                                `${segmentName} - Concept 3`,
                                `${segmentName} - Concept 4`
                            ],
                            "correct_order": [
                                `${segmentName} - Concept 1`,
                                `${segmentName} - Concept 2`,
                                `${segmentName} - Concept 3`,
                                `${segmentName} - Concept 4`
                            ]
                        },
                        "self_correction_grid": {
                            "title": isArabic ? "شبكة التصحيح" : "Assessment Rubric",
                            "total_points": 10,
                            "note_for_parent": isArabic 
                                ? "عزيزي ولي الأمر، استخدم هذه الشبكة لتقييم عمل طفلك."
                                : "Dear parent, use this grid to evaluate your child's work.",
                            "criteria": [
                                {
                                    "name": isArabic ? "الفهم المفاهيمي" : "Conceptual Understanding",
                                    "points": 5,
                                    "indicators": isArabic ? [
                                        "أظهر فهماً لعلاقات المفاهيم",
                                        "تعرف على الروابط المنطقية",
                                        "حدد المعرفة المسبقة بشكل صحيح"
                                    ] : [
                                        "Shows understanding of concept relationships",
                                        "Recognizes logical connections",
                                        "Identifies prerequisite knowledge correctly"
                                    ]
                                },
                                {
                                    "name": isArabic ? "التفكير المنطقي" : "Logical Reasoning",
                                    "points": 3,
                                    "indicators": isArabic ? [
                                        "طبق التفكير المنطقي",
                                        "أخذ في الاعتبار السبب والنتيجة"
                                    ] : [
                                        "Applies logical thinking",
                                        "Considers cause and effect"
                                    ]
                                },
                                {
                                    "name": isArabic ? "الدقة" : "Accuracy",
                                    "points": 2,
                                    "indicators": isArabic ? [
                                        "جميع العناصر في الترتيب الصحيح"
                                    ] : [
                                        "All items in correct order"
                                    ]
                                }
                            ]
                        }
                    }
                ],
                "payload": {
                    "is_integration_lesson": true,
                    "integration_type": "ordering"
                }
            }
        };
    }
}

// Recursively process the curriculum
function processObject(obj, path = []) {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
        return obj.map((item, index) => processObject(item, [...path, index]));
    }
    
    const result = {};
    
    for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];
        
        // Add IDs to questions and final_challenge arrays
        if (key === 'questions' && Array.isArray(value)) {
            result[key] = addIdsToQuestions(value);
        } else if (key === 'final_challenge' && Array.isArray(value)) {
            result[key] = addIdsToFinalChallenges(value);
        } else if (typeof value === 'object' && value !== null) {
            result[key] = processObject(value, currentPath);
        } else {
            result[key] = value;
        }
    }
    
    return result;
}

// Add integration units where needed
function addIntegrationUnits(curriculum) {
    const updated = JSON.parse(JSON.stringify(curriculum));
    
    for (const [gradeName, subjects] of Object.entries(updated)) {
        for (const [subjectName, subjectData] of Object.entries(subjects)) {
            // Skip flat arrays and general subjects
            if (Array.isArray(subjectData) || 
                ['History', 'Geography', 'Civic Education', 'Islamic Education', 'Music', 'Science_Technology', 'Mathematics'].includes(subjectName)) {
                continue;
            }
            
            // For nested subjects (Arabic Language, French)
            let integrationIndex = 0;
            for (const [levelName, levelData] of Object.entries(subjectData)) {
                // Check if integration already exists
                const hasIntegration = Object.keys(levelData).some(k => 
                    k.toLowerCase().includes('integration')
                );
                
                if (!hasIntegration) {
                    const integrationType = integrationIndex % 2 === 0 ? 'writing' : 'ordering';
                    levelData['Integrations'] = createIntegrationUnit(levelName, subjectName, gradeName, integrationType);
                }
                integrationIndex++;
            }
        }
    }
    
    return updated;
}

// Process curriculum
console.log('Processing curriculum...');
let processed = processObject(curriculumJSON);
console.log('Adding integration units...');
processed = addIntegrationUnits(processed);

// Convert back to TypeScript format
const output = `export const curriculumJSON = ${JSON.stringify(processed, null, 4)};\n`;

// Write to file
fs.writeFileSync(curriculumPath, output, 'utf8');

console.log('✅ Successfully updated curriculum.ts with:');
console.log('   - IDs added to all questions');
console.log('   - Difficulty levels added to all questions');
console.log('   - Integration units added to all segments/projects');

