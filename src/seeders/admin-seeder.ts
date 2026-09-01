import prisma from "../config/prisma";
import bcrypt from "bcryptjs";

/**
 * Seed initial admin user
 * Run with: npx ts-node src/seeders/admin-seeder.ts
 */
async function seedAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL || "admin@nedjmati.com";
  const password = process.env.INITIAL_ADMIN_PASSWORD || "Admin@123";

  console.log("🔄 Checking for existing admin...");

  const existingAdmin = await prisma.admins.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingAdmin) {
    console.log(`✅ Admin already exists: ${email}`);
    return;
  }

  console.log("🔄 Creating initial admin user...");

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admins.create({
    data: {
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name: "Super",
      last_name: "Admin",
      role: "super_admin",
      is_active: true,
    },
  });

  console.log(`✅ Admin created successfully!`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   ID: ${admin.id}`);
  console.log("");
  console.log("⚠️  Please change the default password after first login!");
}

seedAdmin()
  .then(() => {
    console.log("🎉 Admin seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
