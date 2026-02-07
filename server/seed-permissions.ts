import { db } from "./db";
import { roles, permissions } from "@shared/schema";
import { logger } from "./utils/logger";

const ROLES = [
  { name: "ADMIN", description: "Full system administrator" },
  { name: "HR", description: "Human resources manager" },
  { name: "ENGINEER", description: "Field engineer / supervisor" },
  { name: "WORKER", description: "Regular employee / worker" },
];

const PERMISSIONS = [
  // Employee management
  { module: "employees", action: "read", description: "View employees" },
  { module: "employees", action: "create", description: "Create employees" },
  { module: "employees", action: "update", description: "Update employees" },
  { module: "employees", action: "delete", description: "Delete employees" },

  // Projects
  { module: "projects", action: "read", description: "View projects" },
  { module: "projects", action: "create", description: "Create projects" },
  { module: "projects", action: "update", description: "Update projects" },
  { module: "projects", action: "delete", description: "Delete projects" },

  // Tasks
  { module: "tasks", action: "read", description: "View tasks" },
  { module: "tasks", action: "create", description: "Create tasks" },
  { module: "tasks", action: "update", description: "Update tasks" },
  { module: "tasks", action: "delete", description: "Delete tasks" },

  // Attendance
  { module: "attendance", action: "read", description: "View attendance" },
  { module: "attendance", action: "create", description: "Record attendance" },
  { module: "attendance", action: "update", description: "Edit attendance" },

  // Payroll
  { module: "payroll", action: "read", description: "View payroll" },
  { module: "payroll", action: "create", description: "Generate payroll" },
  { module: "payroll", action: "approve", description: "Approve payroll" },
  { module: "payroll", action: "release", description: "Release payroll" },

  // Leave
  { module: "leave", action: "read", description: "View leave requests" },
  { module: "leave", action: "create", description: "Create leave requests" },
  { module: "leave", action: "approve", description: "Approve leave requests" },

  // Cash Advances
  { module: "cash-advances", action: "read", description: "View cash advances" },
  { module: "cash-advances", action: "create", description: "Request cash advance" },
  { module: "cash-advances", action: "approve", description: "Approve cash advance" },

  // Disciplinary
  { module: "disciplinary", action: "read", description: "View disciplinary records" },
  { module: "disciplinary", action: "create", description: "Issue NTE" },
  { module: "disciplinary", action: "resolve", description: "Resolve disciplinary" },

  // HR Settings
  { module: "hr-settings", action: "read", description: "View HR settings" },
  { module: "hr-settings", action: "update", description: "Update HR settings" },

  // Audit
  { module: "audit", action: "read", description: "View audit logs" },
];

async function seedPermissions() {
  // Seed roles
  for (const role of ROLES) {
    await db
      .insert(roles)
      .values(role)
      .onConflictDoNothing({ target: roles.name });
  }
  logger.info(`Seeded ${ROLES.length} roles`);

  // Seed permissions
  for (const perm of PERMISSIONS) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }
  logger.info(`Seeded ${PERMISSIONS.length} permissions`);
}

// Allow direct execution
if (process.argv[1]?.includes("seed-permissions")) {
  seedPermissions()
    .then(() => {
      console.log("Permissions seeded successfully");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Failed to seed permissions:", err);
      process.exit(1);
    });
}

export { seedPermissions };
