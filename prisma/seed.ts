import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function hash(password: string) {
  return bcrypt.hashSync(password, 12);
}

async function main() {
  const agent = await prisma.user.upsert({
    where: { email: "agent@bcr.example.com" },
    update: {},
    create: {
      email: "agent@bcr.example.com",
      name: "Alex Agent",
      passwordHash: hash("password"),
      role: "AGENT",
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@bcr.example.com" },
    update: {},
    create: {
      email: "manager@bcr.example.com",
      name: "Morgan Manager",
      passwordHash: hash("password"),
      role: "MANAGER",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@bcr.example.com" },
    update: {},
    create: {
      email: "admin@bcr.example.com",
      name: "Avery Admin",
      passwordHash: hash("password"),
      role: "ADMIN",
    },
  });

  const projectCount = await prisma.project.count();
  let projectId: string | null = null;
  if (projectCount === 0) {
    const p = await prisma.project.create({
      data: { name: "General", color: "#4f46e5" },
    });
    projectId = p.id;
  } else {
    const p = await prisma.project.findFirst();
    projectId = p?.id ?? null;
  }

  const taskCount = await prisma.task.count();
  if (taskCount === 0 && projectId) {
    await prisma.task.create({
      data: {
        title: "Sample request — sign in as manager to approve",
        notes: "Delete this after onboarding your team.",
        creatorId: agent.id,
        reviewStatus: "PENDING_REVIEW",
        executionStatus: "NOT_STARTED",
        projectId,
      },
    });
  }

  console.log("Seed OK. Demo logins (change passwords in production):");
  console.log("  Agent:   agent@bcr.example.com / password");
  console.log("  Manager: manager@bcr.example.com / password");
  console.log("  Admin:   admin@bcr.example.com / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
