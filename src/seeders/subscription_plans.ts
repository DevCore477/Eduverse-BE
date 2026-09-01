import "dotenv/config";
import prisma from "../config/prisma";

export async function seedSubscriptionPlans() {
  const seedData = [
    {
      plan_code: "basic",
      name: "Basic Plan",
      price: 500,
      max_devices: 1,
      max_profiles: 1,
      allowed_years: "1",
      description: "1 pupil, 1 device, 1 year",
    },
    {
      plan_code: "family",
      name: "Family Plan",
      price: 800,
      max_devices: 3,
      max_profiles: 3,
      allowed_years: "3",
      description: "3 pupils, 3 devices, 3 years",
    },
  ];

  const upserts = await Promise.all(
    seedData.map((plan) =>
      prisma.subscription_plans.upsert({
        where: { plan_code: plan.plan_code },
        create: plan,
        update: plan,
      })
    )
  );

  console.log("Subscription plans seed complete:", upserts);
}
