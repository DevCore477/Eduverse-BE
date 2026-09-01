import "dotenv/config";
import prisma from "../config/prisma";

interface MediaObject {
    background_image_url?: string;
    tts_audio_url?: string;
    karaoke_json?: any;
    video_url?: string;
    skip_available_after_seconds?: number;
    extras?: any;
    language?: string;
    voice?: string;
    text?: string;
    url?: string;
}

interface LessonContent {
    audio?: MediaObject;
    video?: MediaObject;
    questions?: any[];
    final_challenge?: any[];
    lessons?: LessonContent[]; // for nested lesson arrays (e.g., French projects)
    [key: string]: any;
}

const MAX_QUESTIONS = 15;

import { curriculumJSON as originalCurriculum } from "./curriculum";

// ========================================================================
// CURRICULUM TRANSFORMATION (Integrated)
// ========================================================================

type Difficulty = "easy" | "medium" | "hard";

// Assign difficulties in a balanced way
function assignDifficulty(index: number, total: number): Difficulty {
    if (total === 1) return "medium";
    if (total === 2) return index === 0 ? "easy" : "medium";
    const pattern: Difficulty[] = ["easy", "medium", "medium", "hard", "medium"];
    return pattern[index % pattern.length];
}

// Process questions - add IDs and difficulty
function processQuestions(questions: any[] | undefined): any[] {
    if (!questions || !Array.isArray(questions)) return [];
    return questions.map((q, index) => ({
        ...q,
        id: index + 1,
        difficulty: q.difficulty || assignDifficulty(index, questions.length),
    }));
}

// Process final challenges - add IDs and difficulty
function processFinalChallenges(challenges: any[] | undefined): any[] {
    if (!challenges || !Array.isArray(challenges)) return [];
    return challenges.map((c, index) => ({
        ...c,
        id: index + 1,
        difficulty: c.difficulty || assignDifficulty(index, challenges.length),
    }));
}

// Integration lessons are now ONLY from curriculum JSON (no defaults generated)
// Keeping this function for reference but it's not used
function createIntegrationLesson_DEPRECATED(segmentName: string, subjectName: string, grade: string, type: "writing" | "ordering" = "writing"): any {
    const isArabic = subjectName === "Arabic Language";
    const language = isArabic ? "ar" : "en";
    const voice = isArabic ? "Zeina" : "Joanna";

    if (type === "writing") {
        return {
            title: "Integration Writing Assessment",
            audio: {
                text: `This is your integration assessment for ${segmentName}. Demonstrate everything you've learned by completing the writing task.`,
                language,
                voice,
                tts_audio_url: `https://example.com/${grade}/integration/${segmentName}/audio.mp3`,
            },
            video: {
                video_url: `https://example.com/${grade}/integration/${segmentName}/video.mp4`,
                skip_available_after_seconds: 10,
            },
            questions: [],
            final_challenge: [
                {
                    id: 1,
                    type: "writing_assessment",
                    difficulty: "hard",
                    points: 10,
                    writing_task: {
                        type: "Written Production",
                        difficulty: "Medium",
                        points: 10,
                        context: `You have completed ${segmentName} in ${subjectName}. Now it's time to demonstrate your comprehensive understanding.`,
                        instruction: `Write a comprehensive response that integrates all the concepts you learned in ${segmentName}.`,
                        requirements: [
                            "Summarize the key concepts learned",
                            "Provide specific examples from the lessons",
                            "Explain how different topics connect together",
                            "Use proper grammar and sentence structure",
                            "Write clearly and organize your thoughts"
                        ],
                        length: "6-8 lines"
                    },
                    self_correction_grid: {
                        title: "Assessment Rubric",
                        total_points: 10,
                        note_for_parent: "Dear parent, use this grid to evaluate your child's written work.",
                        criteria: [
                            {
                                name: "Content & Ideas",
                                points: 4,
                                indicators: [
                                    "Addresses all key concepts from the segment",
                                    "Provides clear and relevant examples",
                                    "Shows understanding of topic connections",
                                    "Meets the required length"
                                ]
                            },
                            {
                                name: "Organization",
                                points: 2,
                                indicators: [
                                    "Ideas are logically organized",
                                    "Clear introduction and conclusion",
                                    "Smooth transitions between ideas"
                                ]
                            },
                            {
                                name: "Language Use",
                                points: 3,
                                indicators: [
                                    "Uses proper grammar and sentence structure",
                                    "Appropriate vocabulary for the topic",
                                    "Correct spelling and punctuation"
                                ]
                            },
                            {
                                name: "Presentation",
                                points: 1,
                                indicators: [
                                    "Neat handwriting and clean presentation"
                                ]
                            }
                        ]
                    }
                }
            ],
            payload: {
                is_integration_lesson: true,
                integration_type: "writing",
                integration_assessment: {
                    type: "writing_assessment",
                    segment: segmentName
                }
            }
        };
    } else {
        // Ordering type integration - same structure as writing assessment
        return {
            title: "Integration Ordering Assessment",
            audio: {
                text: `For this integration assessment, you will organize concepts from ${segmentName} in the correct order.`,
                language,
                voice,
                tts_audio_url: `https://example.com/${grade}/integration/${segmentName}/ordering/audio.mp3`,
            },
            video: {
                video_url: `https://example.com/${grade}/integration/${segmentName}/ordering/video.mp4`,
                skip_available_after_seconds: 10,
            },
            questions: [],
            final_challenge: [
                {
                    id: 1,
                    type: "ordering_assessment",
                    difficulty: "hard",
                    points: 10,
                    ordering_task: {
                        type: "Ordering Task",
                        difficulty: "Medium",
                        points: 10,
                        context: `You have completed ${segmentName} in ${subjectName}. Understanding the logical sequence of concepts is essential for mastery.`,
                        instruction: `Arrange the following key concepts from ${segmentName} in their correct logical order or sequence.`,
                        requirements: [
                            "Understand the relationship between concepts",
                            "Consider cause and effect relationships",
                            "Think about the natural progression of ideas",
                            "Pay attention to prerequisite knowledge"
                        ],
                        items: [
                            `First key concept from ${segmentName}`,
                            `Second key concept from ${segmentName}`,
                            `Third key concept from ${segmentName}`,
                            `Fourth key concept from ${segmentName}`
                        ],
                        correct_order: [
                            `First key concept from ${segmentName}`,
                            `Second key concept from ${segmentName}`,
                            `Third key concept from ${segmentName}`,
                            `Fourth key concept from ${segmentName}`
                        ]
                    },
                    self_correction_grid: {
                        title: "Ordering Assessment Rubric",
                        total_points: 10,
                        note_for_parent: "Dear parent, use this grid to evaluate your child's ordering task.",
                        criteria: [
                            {
                                name: "Conceptual Understanding",
                                points: 5,
                                indicators: [
                                    "Demonstrates understanding of concept relationships",
                                    "Recognizes logical connections between ideas",
                                    "Identifies prerequisite knowledge correctly",
                                    "Shows comprehension of the overall progression"
                                ]
                            },
                            {
                                name: "Logical Reasoning",
                                points: 3,
                                indicators: [
                                    "Applies logical thinking to sequence",
                                    "Considers cause and effect relationships",
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
            ],
            payload: {
                is_integration_lesson: true,
                integration_type: "ordering",
                integration_assessment: {
                    type: "ordering_assessment",
                    segment: segmentName
                }
            }
        };
    }
}

// Process a single lesson recursively
function processLesson(lesson: any): any {
    if (!lesson) return lesson;

    const processed = { ...lesson };

    if (lesson.questions) {
        processed.questions = processQuestions(lesson.questions);
    }

    if (lesson.final_challenge) {
        processed.final_challenge = processFinalChallenges(lesson.final_challenge);
    }

    // Handle nested lessons
    if (lesson.lessons) {
        if (Array.isArray(lesson.lessons)) {
            processed.lessons = lesson.lessons.map(processLesson);
        } else if (typeof lesson.lessons === "object") {
            processed.lessons = {};
            for (const [key, value] of Object.entries(lesson.lessons)) {
                processed.lessons[key] = processLesson(value);
            }
        }
    }

    return processed;
}

// Create general subject structure (flat array of lessons)
function createGeneralSubject(subjectName: string, grade: string): any[] {
    const language = ["Islamic Education", "Arabic Language"].includes(subjectName) ? "ar" : "en";
    const voice = language === "ar" ? "Zeina" : "Joanna";

    return [
        {
            title: `Introduction to ${subjectName}`,
            audio: {
                text: `Welcome to ${subjectName}. In this lesson, we'll explore the fundamental concepts.`,
                language,
                voice,
                tts_audio_url: `https://example.com/${grade}/${subjectName.toLowerCase().replace(/ /g, "_")}/lesson1/audio.mp3`,
            },
            video: {
                video_url: `https://example.com/${grade}/${subjectName.toLowerCase().replace(/ /g, "_")}/lesson1/video.mp4`,
                skip_available_after_seconds: 5,
            },
            questions: [
                {
                    id: 1,
                    type: "multiple_choice",
                    question: `What is the main focus of ${subjectName}?`,
                    options: ["Understanding key concepts", "Memorizing facts", "Taking tests", "None of the above"],
                    answer: "Understanding key concepts",
                    points: 3,
                    difficulty: "easy",
                    hints: {
                        correct: "Excellent! You understand the purpose of this subject.",
                        wrong: "Think about why we study this subject."
                    }
                },
                {
                    id: 2,
                    type: "true_false",
                    question: `${subjectName} helps us understand the world around us.`,
                    answer: true,
                    points: 3,
                    difficulty: "medium",
                    hints: {
                        correct: "Correct! This subject broadens our understanding.",
                        wrong: "Consider the benefits of studying this subject."
                    }
                }
            ],
            final_challenge: [
                {
                    id: 1,
                    type: "short_answer",
                    question: `Explain in your own words what you learned about ${subjectName}.`,
                    answer: "",
                    points: 5,
                    difficulty: "medium",
                    hints: {
                        correct: "Great answer! You've understood the key concepts.",
                        wrong: "Try to include more details from the lesson."
                    }
                }
            ]
        }
    ];
}

// Transform entire curriculum
function transformCurriculum(curriculum: any): any {
    const transformed: any = {};

    for (const [gradeName, subjects] of Object.entries(curriculum)) {
        transformed[gradeName] = {};

        for (const [subjectName, subjectData] of Object.entries(subjects as any)) {
            if (Array.isArray(subjectData)) {
                // Flat array - process each lesson
                transformed[gradeName][subjectName] = subjectData.map(processLesson);
            } else {
                // Nested structure - process levels/units
                transformed[gradeName][subjectName] = {};
                for (const [levelName, levelData] of Object.entries(subjectData as any)) {
                    // Check if levelData is a string (like a title) or an object
                    if (typeof levelData === 'string') {
                        // Preserve string values directly
                        transformed[gradeName][subjectName][levelName] = levelData;
                        continue;
                    }
                    transformed[gradeName][subjectName][levelName] = {};

                    // Process units (no default integration generation)
                    for (const [unitName, unitData] of Object.entries(levelData as any)) {
                        // Skip if unitData is a string
                        if (typeof unitData === 'string') {
                            transformed[gradeName][subjectName][levelName][unitName] = unitData;
                            continue;
                        }

                        // Check if it's an integration unit
                        if (unitName.toLowerCase().includes("integration")) {
                            // Process existing integration unit
                            const integrationUnit: any = {};
                            if (typeof unitData === "object" && unitData !== null) {
                                for (const [key, value] of Object.entries(unitData)) {
                                    integrationUnit[key] = processLesson(value);
                                }
                            }
                            transformed[gradeName][subjectName][levelName][unitName] = integrationUnit;
                        } else {
                            // Process regular unit
                            const processedUnit: any = {};

                            if (typeof unitData === "object" && unitData !== null) {
                                for (const [key, value] of Object.entries(unitData)) {
                                    if (key === "lessons" && typeof value === "object") {
                                        processedUnit.lessons = {};
                                        for (const [lessonKey, lessonValue] of Object.entries(value as any)) {
                                            processedUnit.lessons[lessonKey] = processLesson(lessonValue);
                                        }
                                    } else if (Array.isArray(value)) {
                                        processedUnit[key] = value.map(processLesson);
                                    } else if (typeof value === "object") {
                                        processedUnit[key] = processLesson(value);
                                    } else {
                                        processedUnit[key] = value;
                                    }
                                }
                            }

                            transformed[gradeName][subjectName][levelName][unitName] = processedUnit;
                        }
                    }
                }
            }
        }

        // General subjects are now ONLY from curriculum JSON (no defaults generated)
        // Just process what's already there
        const generalSubjects = ["History", "Geography", "Civic Education", "Islamic Education", "Music"];
        const subjectsObj = subjects as Record<string, any>;

        for (const generalSubject of generalSubjects) {
            // Only process if it exists in curriculum
            if (subjectsObj[generalSubject]) {
                const existingData = subjectsObj[generalSubject];
                if (Array.isArray(existingData)) {
                    transformed[gradeName][generalSubject] = existingData.map(processLesson);
                } else {
                    transformed[gradeName][generalSubject] = processLesson(existingData);
                }
            }
        }
    }

    return transformed;
}

// Transform curriculum on load
const curriculumJSON = transformCurriculum(originalCurriculum);

// Lesson step order
const STEP_ORDER = [
    { step_type: "lesson_intro", unlock_rule: "auto_unlock" },
    { step_type: "lesson_video", unlock_rule: "after:lesson_intro" },
    { step_type: "practice_questions", unlock_rule: "always" },
    { step_type: "final_journey", unlock_rule: "after:lesson_video" },
];

// === UTILS ===============================================================
// Minimal helper to reduce repetition. Prisma model names match table names.
async function insertOne<T = any>(table: string, payload: any): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (prisma as any)[table];
    if (!model?.create) {
        throw new Error(`Unknown table/model: ${table}`);
    }
    return model.create({ data: payload });
}

async function insertLessonContent(stepId: string, media?: MediaObject) {
    if (!media) return;

    await insertOne("lesson_step_content", {
        step_id: stepId,
        background_image_url: media.background_image_url || null,
        tts_audio_url: media.tts_audio_url || null,
        karaoke_json: media.karaoke_json || null,
        video_url: media.video_url || media?.url || null,
        skip_available_after_seconds: media.skip_available_after_seconds || 10,
        extras: media.extras || {
            text: media.text || null,
            voice: media.voice || null,
            language: media.language || null,
        }
    });
}

// Ensure questions/final challenges carry hints for correct and wrong answers
function withHints<T extends Record<string, any>>(obj: T): T {
    const hints = obj.hints || {};
    return {
        ...obj,
        hints: {
            correct:
                hints.correct ||
                obj.correct_hint ||
                "Great job! You nailed it. Keep up the good work.",
            wrong:
                hints.wrong ||
                obj.wrong_hint ||
                "Not quite. Re-read the question and try again.",
            picture_url: hints?.picture_url || obj?.picture_url || null,
        },
    } as T;
}

function capQuestions(items: any[] | undefined) {
    return (items || []).slice(0, MAX_QUESTIONS);
}

// Find or create Academic Year
async function findOrCreateAcademicYear(name: string) {
    const existing = await prisma.academic_years.findUnique({ where: { name } });
    if (existing) return existing;
    const extractedGrade = Number(name.replace(/[^0-9]/g, "")) || null;
    console.log("extractedGrade ==>", extractedGrade);
    return prisma.academic_years.create({
        data: {
            name,
            description: `${name} curriculum`,
            grade: extractedGrade,
        },
    });
}

// Find or create Subject
async function findOrCreateSubject(name: string, academic_year_id: string, code: string, description: string) {
    const existing = await prisma.subjects.findUnique({
        where: { code },
        include: { subject_structure: true }
    });

    if (existing) {
        // Check if subject already has content
        if (existing.subject_structure && existing.subject_structure.length > 0) {
            console.log(`⚠️  Subject "${name}" (${code}) already has content. Skipping...`);
            return { ...existing, skipContent: true };
        }
        console.log(`📌 Subject "${name}" (${code}) exists but has no content. Will populate...`);
        return existing;
    }

    console.log(`✨ Creating new subject: "${name}" (${code})`);
    return prisma.subjects.create({
        data: { name, academic_year_id, code, description, journey_type: "linear" },
    });
}

// Create steps + unlock rules
async function createLessonSteps(nodeId: string) {
    const stepIds: Record<string, string> = {};

    for (const [index, step] of STEP_ORDER.entries()) {
        const created = await prisma.lesson_steps.create({
            data: {
                node_id: nodeId,
                step_type: step.step_type as any,
                order_index: index + 1,
                unlock_rule: step.unlock_rule,
            },
        });
        stepIds[step.step_type] = created.id;
    }

    // Unlock rules
    if (stepIds["lesson_video"]) {
        await prisma.step_unlock_rules.create({
            data: {
                step_id: stepIds["lesson_video"],
                depends_on: "lesson_intro",
            },
        });
    }
    if (stepIds["final_journey"]) {
        await prisma.step_unlock_rules.create({
            data: {
                step_id: stepIds["final_journey"],
                depends_on: "lesson_video",
            },
        });
    }

    return stepIds;
}

// Integration units are now defined in curriculum JSON via the transformer

// ========================================================================
// MAIN SEEDER
// ========================================================================

export async function seedFullCurriculum() {
    try {
        console.log("\n🌱 ==========================================");
        console.log("🌱 Starting Comprehensive Curriculum Seeding");
        console.log("🌱 ==========================================\n");

        const yearCount = Object.keys(curriculumJSON).length;
        let yearIndex = 0;

        for (const [yearName, subjects] of Object.entries(curriculumJSON)) {
            yearIndex++;
            console.log(`\n⭐ [${yearIndex}/${yearCount}] Processing Academic Year: ${yearName}`);
            const year = await findOrCreateAcademicYear(yearName);
            console.log(`   ID: ${year.id}, Grade: ${year.grade || 'N/A'}`);

            for (const [subjectName, subjectData] of Object.entries(subjects as Record<string, any>)) {
                const code = `${subjectName.toLowerCase().replace(/ /g, "_")}_${yearName}`;
                const yearId = year.id as string;
                const subject = await findOrCreateSubject(subjectName, yearId, code, `${subjectName} for ${yearName}`);

                console.log(`  📚 Processing: ${subjectName}`);

                // Skip if subject already has content
                if ((subject as any).skipContent) {
                    console.log(`  ⏭️  Skipping ${subjectName} - already populated`);
                    continue;
                }

                const rootNode = await insertOne("subject_structure", {
                    subject_id: subject.id,
                    parent_id: null,
                    node_type: "root",
                    title: `${subjectName} Root`,
                    order_index: 0,
                });

                // Flat lessons
                if (Array.isArray(subjectData)) {
                    for (const [index, lessonObj] of (subjectData as LessonContent[]).entries()) {
                        const lesson = lessonObj as LessonContent;
                        const lessonPayload = (lesson as any).payload || null;

                        const lessonNode = await insertOne("subject_structure", {
                            subject_id: subject.id,
                            parent_id: rootNode.id,
                            node_type: "lesson",
                            title: lessonObj.title,
                            order_index: index + 1,
                            payload: lessonPayload,
                        });

                        const steps = await createLessonSteps(lessonNode.id);

                        // Insert AUDIO into lesson_intro step
                        if (lesson.audio) {
                            await insertLessonContent(steps["lesson_intro"], lesson.audio);
                        }

                        // Insert VIDEO into lesson_video step
                        if (lesson.video) {
                            await insertLessonContent(steps["lesson_video"], lesson.video);
                        }

                        // Practice questions
                        for (const q of capQuestions(lesson.questions)) {
                            const questionWithHints = withHints(q);
                            await insertOne("lesson_practice_questions", {
                                node_id: lessonNode.id,
                                question_json: questionWithHints,
                                points: q.points || 3,
                                difficulty: q.difficulty || "medium",
                            });
                        }

                        // Final challenge
                        for (const fc of capQuestions(lesson.final_challenge)) {
                            const challengeWithHints = withHints(fc);
                            await insertOne("lesson_final_challenges", {
                                node_id: lessonNode.id,
                                challenge_json: challengeWithHints,
                                points: fc.points || 3,
                                difficulty: fc.difficulty || "medium",
                                question_id: fc.id || null,
                                order_index: fc.id || null,
                            });
                        }
                    }
                } else {
                    // Nested (levels → units → lessons)
                    let levelOrder = 1;
                    for (const [levelName, levelData] of Object.entries(subjectData as Record<string, any>)) {

                        let levelTitle;
                        if (levelData && typeof levelData.title === "string") {
                            levelTitle = levelData.title;
                        } else {
                            levelTitle = levelName;
                        }

                        const levelNode = await insertOne("subject_structure", {
                            subject_id: subject.id,
                            parent_id: rootNode.id,
                            node_type: "level",
                            title: levelTitle,
                            order_index: levelOrder++,
                        });
                        let unitOrder = 1;
                        for (const [unitName, unitData] of Object.entries(levelData as any)) {

                            if (typeof unitData === "string") {
                                continue
                            }
                            const isIntegrationUnit =
                                unitName.toLowerCase().includes("integration");

                            // Extract integration metadata from the first lesson if it's an integration unit
                            let integrationMeta = null;
                            if (isIntegrationUnit && typeof unitData === "object" && unitData !== null) {
                                const firstLesson = Object.values(unitData as Record<string, any>)[0] as any;
                                integrationMeta = firstLesson?.payload?.integration_assessment || 
                                                firstLesson?.final_challenge?.[0] ||
                                null;
                            }

                            const unitPayload = isIntegrationUnit
                                ? {
                                    is_integration_unit: true,
                                    integration_assessment: integrationMeta,
                                    min_characters: integrationMeta?.min_characters || 50,
                                }
                                : null;

                            const unitNode = await insertOne("subject_structure", {
                                subject_id: subject.id,
                                parent_id: levelNode.id,
                                node_type: "unit",
                                title: unitName,
                                order_index: unitOrder++,
                                payload: unitPayload,
                            });

                            let lessonOrder = 1;

                            // Case 0: Unit-level lesson data (Arabic-style) where questions/final_challenge live on the unit object itself
                            // if (unitHasDirectQuestions) {
                            //     const lessonPayload =
                            //         (unitData as any).payload ||
                            //         (isIntegrationUnit
                            //             ? {
                            //                 is_integration_lesson: true,
                            //                 integration_assessment:
                            //                     integrationMeta ||
                            //                     (unitData as any).final_challenge?.[0],
                            //             }
                            //             : null);
                            //
                            //     const lessonNode = await insertOne("subject_structure", {
                            //         subject_id: subject.id,
                            //         parent_id: unitNode.id,
                            //         node_type: "lesson",
                            //         title: unitName,
                            //         order_index: lessonOrder++,
                            //         payload: lessonPayload,
                            //     });
                            //
                            //     const steps = await createLessonSteps(lessonNode.id);
                            //
                            //     if ((unitData as any).audio) {
                            //         await insertLessonContent(steps["lesson_intro"], (unitData as any).audio);
                            //     }
                            //     if ((unitData as any).video) {
                            //         await insertLessonContent(steps["lesson_video"], (unitData as any).video);
                            //     }
                            //
                            //     for (const q of capQuestions((unitData as any).questions)) {
                            //         const questionWithHints = withHints(q);
                            //         await insertOne("lesson_practice_questions", {
                            //             node_id: lessonNode.id,
                            //             question_json: questionWithHints,
                            //             points: q.points || 3,
                            //         });
                            //     }
                            //
                            //     for (const fc of capQuestions((unitData as any).final_challenge)) {
                            //         const challengeWithHints = withHints(fc);
                            //         await insertOne("lesson_final_challenges", {
                            //             node_id: lessonNode.id,
                            //             challenge_json: challengeWithHints,
                            //             points: fc.points || 3,
                            //         });
                            //     }
                            //     continue; // Skip nested iteration; already handled this unit
                            // }
                            // 🔴 FIX: Arabic-style units where lessons are nested under `lessons`
                            if ((unitData as any)?.lessons && typeof (unitData as any).lessons === "object") {
                                for (const [lessonName, lesson] of Object.entries((unitData as any).lessons)) {
                                    const lessonData = lesson as LessonContent;
                                    const lessonPayload = (lessonData as any).payload || null;

                                    const lessonNode = await insertOne("subject_structure", {
                                        subject_id: subject.id,
                                        parent_id: unitNode.id,
                                        node_type: "lesson",
                                        title: lessonData.title || lessonName,
                                        order_index: lessonOrder++,
                                        payload: lessonPayload,
                                    });

                                    const steps = await createLessonSteps(lessonNode.id);

                                    // AUDIO
                                    if (lessonData.audio) {
                                        await insertLessonContent(steps["lesson_intro"], lessonData.audio);
                                    }

                                    // VIDEO
                                    if (lessonData.video) {
                                        await insertLessonContent(steps["lesson_video"], lessonData.video);
                                    }

                                    // PRACTICE QUESTIONS ✅ (THIS IS WHAT WAS MISSING)
                                    for (const q of capQuestions(lessonData.questions)) {
                                        const questionWithHints = withHints(q);
                                        await insertOne("lesson_practice_questions", {
                                            node_id: lessonNode.id,
                                            question_json: questionWithHints,
                                            points: q.points || 3,
                                            difficulty: q.difficulty || "medium",
                                        });
                                    }

                                    // FINAL CHALLENGE
                                    for (const fc of capQuestions(lessonData.final_challenge)) {
                                        const challengeWithHints = withHints(fc);
                                        await insertOne("lesson_final_challenges", {
                                            node_id: lessonNode.id,
                                            challenge_json: challengeWithHints,
                                            points: fc.points || 3,
                                            difficulty: fc.difficulty || "medium",
                                            question_id: fc.id || null,
                                            order_index: fc.id || null,
                                        });
                                    }
                                }

                                // ⛔ IMPORTANT: skip the generic Object.entries(unitData) loop
                                continue;
                            }


                            for (const [lessonName, rawLesson] of Object.entries(unitData as any)) {
                                if (lessonName === "questions" || lessonName === "final_challenge") continue;
                                // Case A0: lessons provided as a raw array (French-style)
                                if (Array.isArray(rawLesson)) {
                                    const lessonsArray = rawLesson as LessonContent[];
                                    for (const [idx, lessonItem] of lessonsArray.entries()) {
                                        const resolvedTitle = lessonItem.title || `${lessonName} Lesson ${idx + 1}`;
                                        const lessonPayload = (lessonItem as any).payload || null;
                                        const lessonNode = await insertOne("subject_structure", {
                                            subject_id: subject.id,
                                            parent_id: unitNode.id,
                                            node_type: "lesson",
                                            title: resolvedTitle,
                                            order_index: lessonOrder++,
                                            payload: lessonPayload,
                                        });

                                        const steps = await createLessonSteps(lessonNode.id);

                                        if (lessonItem.audio) {
                                            await insertLessonContent(steps["lesson_intro"], lessonItem.audio);
                                        }
                                        if (lessonItem.video) {
                                            await insertLessonContent(steps["lesson_video"], lessonItem.video);
                                        }

                                        for (const q of capQuestions(lessonItem.questions)) {
                                            const questionWithHints = withHints(q);
                                            await insertOne("lesson_practice_questions", {
                                                node_id: lessonNode.id,
                                                question_json: questionWithHints,
                                                points: q.points || 3,
                                                difficulty: q.difficulty || "medium",
                                            });
                                        }

                                        for (const fc of capQuestions(lessonItem.final_challenge)) {
                                            const challengeWithHints = withHints(fc);
                                            await insertOne("lesson_final_challenges", {
                                                node_id: lessonNode.id,
                                                challenge_json: challengeWithHints,
                                                points: fc.points || 3,
                                                difficulty: fc.difficulty || "medium",
                                                question_id: fc.id || null,
                                                order_index: fc.id || null,
                                            });
                                        }
                                    }
                                    continue;
                                }


                                // Case A: French-style sequences with lessons array under a key
                                if (Array.isArray((rawLesson as any)?.lessons)) {
                                    const lessonsArray = (rawLesson as LessonContent).lessons || [];
                                    for (const [idx, lessonItem] of lessonsArray.entries()) {
                                        const resolvedTitle = lessonItem.title || `${lessonName} Lesson ${idx + 1}`;
                                        const lessonPayload = (lessonItem as any).payload || null;
                                        const lessonNode = await insertOne("subject_structure", {
                                            subject_id: subject.id,
                                            parent_id: unitNode.id,
                                            node_type: "lesson",
                                            title: resolvedTitle,
                                            order_index: lessonOrder++,
                                            payload: lessonPayload,
                                        });

                                        const steps = await createLessonSteps(lessonNode.id);

                                        if (lessonItem.audio) {
                                            await insertLessonContent(steps["lesson_intro"], lessonItem.audio);
                                        }
                                        if (lessonItem.video) {
                                            await insertLessonContent(steps["lesson_video"], lessonItem.video);
                                        }

                                        for (const q of capQuestions(lessonItem.questions)) {
                                            const questionWithHints = withHints(q);
                                            await insertOne("lesson_practice_questions", {
                                                node_id: lessonNode.id,
                                                question_json: questionWithHints,
                                                points: q.points || 3,
                                                difficulty: q.difficulty || "medium",
                                            });
                                        }

                                        for (const fc of capQuestions(lessonItem.final_challenge)) {
                                            const challengeWithHints = withHints(fc);
                                            await insertOne("lesson_final_challenges", {
                                                node_id: lessonNode.id,
                                                challenge_json: challengeWithHints,
                                                points: fc.points || 3,
                                                difficulty: fc.difficulty || "medium",
                                                question_id: fc.id || null,
                                                order_index: fc.id || null,
                                            });
                                        }
                                    }
                                } else {
                                    // Case B: Standard lesson object
                                    const lesson = rawLesson as LessonContent;
                                    const lessonPayload = (lesson as any).payload || null;

                                    const lessonNode = await insertOne("subject_structure", {
                                        subject_id: subject.id,
                                        parent_id: unitNode.id,
                                        node_type: "lesson",
                                        title: lesson.title || lessonName,
                                        order_index: lessonOrder++,
                                        payload: lessonPayload,
                                    });

                                    const steps = await createLessonSteps(lessonNode.id);

                                    // AUDIO
                                    if (lesson.audio) {
                                        await insertLessonContent(steps["lesson_intro"], lesson.audio);
                                    }

                                    // VIDEO
                                    if (lesson.video) {
                                        await insertLessonContent(steps["lesson_video"], lesson.video);
                                    }

                                    // Questions
                                    for (const q of capQuestions(lesson.questions)) {
                                        const questionWithHints = withHints(q);
                                        await insertOne("lesson_practice_questions", {
                                            node_id: lessonNode.id,
                                            question_json: questionWithHints,
                                            points: q.points || 3,
                                            difficulty: q.difficulty || "medium",
                                        });
                                    }

                                    // Final challenge
                                    for (const fc of capQuestions(lesson.final_challenge)) {
                                        const challengeWithHints = withHints(fc);
                                        await insertOne("lesson_final_challenges", {
                                            node_id: lessonNode.id,
                                            challenge_json: challengeWithHints,
                                            points: fc.points || 3,
                                            difficulty: fc.difficulty || "medium",
                                            question_id: fc.id || null,
                                            order_index: fc.id || null,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        console.log("\n\n✅ ==========================================");
        console.log("✅ ALL CURRICULUM SEEDED SUCCESSFULLY!");
        console.log("✅ ==========================================\n");
    } catch (err) {
        console.error("\n❌ ==========================================");
        console.error("❌ SEEDING FAILED");
        console.error("❌ ==========================================");
        console.error("Error details:", err);
        console.error("\nStack trace:", (err as Error).stack);
        throw err; // Re-throw to ensure process exits with error code
    }
}
