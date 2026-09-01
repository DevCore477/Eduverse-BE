import { seedSubscriptionPlans } from "./subscription_plans";
import {seedFullCurriculum} from "./subjects";
import prisma from "../config/prisma";

async function runSeed() {
  try {
    await seedSubscriptionPlans();
    await seedFullCurriculum();

    console.log("✅ All seeders completed successfully");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

runSeed();