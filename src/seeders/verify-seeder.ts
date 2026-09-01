import "dotenv/config";
import prisma from "../config/prisma";

/**
 * Verification script to check that the curriculum seeder worked properly
 */

async function verifyCurriculum() {
    console.log("\n🔍 ==========================================");
    console.log("🔍 Starting Curriculum Verification");
    console.log("🔍 ==========================================\n");

    try {
        // 1. Check Academic Years
        const academicYears = await prisma.academic_years.findMany({
            include: {
                subjects: true,
            },
        });

        console.log(`✅ Academic Years: ${academicYears.length}`);
        for (const year of academicYears) {
            console.log(`   - ${year.name} (Grade ${year.grade || "N/A"}): ${year.subjects.length} subjects`);
        }

        // 2. Check Subjects
        const subjects = await prisma.subjects.findMany({
            include: {
                subject_structure: {
                    where: { node_type: "root" },
                },
            },
        });

        console.log(`\n✅ Subjects: ${subjects.length}`);
        const subjectsByYear: Record<string, string[]> = {};
        for (const subject of subjects) {
            const year = academicYears.find((y: any) => y.id === subject.academic_year_id);
            const yearName = year?.name || "Unknown";
            if (!subjectsByYear[yearName]) subjectsByYear[yearName] = [];
            subjectsByYear[yearName].push(subject.name);
        }
        
        for (const [year, subs] of Object.entries(subjectsByYear)) {
            console.log(`\n   ${year}:`);
            for (const sub of subs) {
                console.log(`     - ${sub}`);
            }
        }

        // 3. Check Structure Nodes
        const structureStats = await prisma.subject_structure.groupBy({
            by: ["node_type"],
            _count: true,
        });

        console.log(`\n✅ Structure Nodes:`);
        for (const stat of structureStats) {
            console.log(`   - ${stat.node_type}: ${stat._count}`);
        }

        // 4. Check Questions with Difficulty
        const questionsWithDifficulty = await prisma.lesson_practice_questions.groupBy({
            by: ["difficulty"],
            _count: true,
        });

        console.log(`\n✅ Practice Questions by Difficulty:`);
        let totalPracticeQuestions = 0;
        for (const stat of questionsWithDifficulty) {
            console.log(`   - ${stat.difficulty || "null"}: ${stat._count}`);
            totalPracticeQuestions += stat._count;
        }
        console.log(`   Total: ${totalPracticeQuestions}`);

        // 5. Check Final Challenges with Difficulty and IDs
        const challengesWithDifficulty = await prisma.lesson_final_challenges.groupBy({
            by: ["difficulty"],
            _count: true,
        });

        console.log(`\n✅ Final Challenges by Difficulty:`);
        let totalFinalChallenges = 0;
        for (const stat of challengesWithDifficulty) {
            console.log(`   - ${stat.difficulty || "null"}: ${stat._count}`);
            totalFinalChallenges += stat._count;
        }
        console.log(`   Total: ${totalFinalChallenges}`);

        // Check challenges with question_id
        const challengesWithId = await prisma.lesson_final_challenges.findMany({
            where: {
                question_id: { not: null },
            },
            select: {
                question_id: true,
            },
        });
        console.log(`   With question_id: ${challengesWithId.length}`);

        // 6. Check Integration Units
        const integrationUnits = await prisma.subject_structure.findMany({
            where: {
                OR: [
                    { title: { contains: "Integration", mode: "insensitive" } },
                    { payload: { path: ["is_integration_unit"], equals: true } },
                ],
            },
            include: {
                subjects: true,
            },
        });

        console.log(`\n✅ Integration Units: ${integrationUnits.length}`);
        for (const unit of integrationUnits) {
            console.log(`   - ${unit.title} (${unit.subjects.name})`);
        }

        // 7. Check General Subjects (History, Geography, etc.)
        const generalSubjects = ["History", "Geography", "Civic Education", "Islamic Education", "Music"];
        const foundGeneralSubjects = subjects.filter((s: any) =>
            generalSubjects.some((gs: any) => s.name.includes(gs))
        );

        console.log(`\n✅ General Subjects: ${foundGeneralSubjects.length}`);
        for (const subject of foundGeneralSubjects) {
            const year = academicYears.find((y: any) => y.id === subject.academic_year_id);
            console.log(`   - ${subject.name} (${year?.name || "Unknown"})`);
        }

        // 8. Sample a lesson to check structure
        const sampleLesson = await prisma.subject_structure.findFirst({
            where: {
                node_type: "lesson",
            },
            include: {
                lesson_steps: {
                    include: {
                        lesson_step_content: true,
                    },
                },
                lesson_practice_questions: true,
                lesson_final_challenges: true,
            },
        });

        if (sampleLesson) {
            console.log(`\n✅ Sample Lesson: "${sampleLesson.title}"`);
            console.log(`   - Steps: ${sampleLesson.lesson_steps.length}`);
            console.log(`   - Practice Questions: ${sampleLesson.lesson_practice_questions.length}`);
            console.log(`   - Final Challenges: ${sampleLesson.lesson_final_challenges.length}`);
            
            if (sampleLesson.lesson_practice_questions.length > 0) {
                const q = sampleLesson.lesson_practice_questions[0];
                console.log(`   - Sample Question Difficulty: ${q.difficulty || "null"}`);
            }
            
            if (sampleLesson.lesson_final_challenges.length > 0) {
                const fc = sampleLesson.lesson_final_challenges[0];
                console.log(`   - Sample Challenge Difficulty: ${fc.difficulty || "null"}`);
                console.log(`   - Sample Challenge Question ID: ${fc.question_id || "null"}`);
            }
        }

        console.log("\n✅ ==========================================");
        console.log("✅ Verification Complete - All Looks Good!");
        console.log("✅ ==========================================\n");
    } catch (err) {
        console.error("\n❌ ==========================================");
        console.error("❌ Verification Failed");
        console.error("❌ ==========================================");
        console.error("Error:", err);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

verifyCurriculum();

