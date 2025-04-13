import { db } from "../server/db";
import { 
  users, projects, projectMembers, columns, contents, attachments,
  type InsertUser, type InsertProject, type InsertProjectMember, 
  type InsertColumn, type InsertContent, type InsertAttachment 
} from "../shared/schema";

async function main() {
  console.log("Initializing database with sample data...");

  // Clear existing data (optional, run this only in development)
  await db.delete(attachments);
  await db.delete(contents);
  await db.delete(columns);
  await db.delete(projectMembers);
  await db.delete(projects);
  await db.delete(users);

  // Create sample users
  const johnDoe: InsertUser = {
    username: "johndoe",
    password: "password123", // In production, use proper password hashing
    displayName: "John Doe",
    email: "john@example.com",
    avatarInitials: "JD",
    avatarColor: "#4F46E5", // indigo
  };

  const janeDoe: InsertUser = {
    username: "janedoe",
    password: "password123",
    displayName: "Jane Doe",
    email: "jane@example.com",
    avatarInitials: "JD",
    avatarColor: "#06B6D4", // cyan
  };

  const bobSmith: InsertUser = {
    username: "bobsmith",
    password: "password123",
    displayName: "Bob Smith",
    email: "bob@example.com",
    avatarInitials: "BS",
    avatarColor: "#10B981", // emerald
  };

  console.log("Creating users...");
  const [johnDoeUser] = await db.insert(users).values(johnDoe).returning();
  const [janeDoeUser] = await db.insert(users).values(janeDoe).returning();
  const [bobSmithUser] = await db.insert(users).values(bobSmith).returning();

  console.log(`Created users with IDs: ${johnDoeUser.id}, ${janeDoeUser.id}, ${bobSmithUser.id}`);

  // Create projects
  const videoProject: InsertProject = {
    name: "IMMORTALITY",
    description: "BREAKTHROUGH SCIENTIFIC BREAKTHROUGHS WITH AI",
    type: "youtube",
    createdBy: johnDoeUser.id,
  };

  const pitchProject: InsertProject = {
    name: "Product Launch Video Series",
    description: "Series of videos for the new product launch",
    type: "pitch",
    createdBy: janeDoeUser.id,
  };

  console.log("Creating projects...");
  const [videoProjectData] = await db.insert(projects).values(videoProject).returning();
  const [pitchProjectData] = await db.insert(projects).values(pitchProject).returning();

  console.log(`Created projects with IDs: ${videoProjectData.id}, ${pitchProjectData.id}`);

  // Add project members
  const videoProjectMembers: InsertProjectMember[] = [
    { projectId: videoProjectData.id, userId: janeDoeUser.id },
    { projectId: videoProjectData.id, userId: bobSmithUser.id },
  ];

  const pitchProjectMembers: InsertProjectMember[] = [
    { projectId: pitchProjectData.id, userId: johnDoeUser.id },
    { projectId: pitchProjectData.id, userId: bobSmithUser.id },
  ];

  console.log("Adding project members...");
  await db.insert(projectMembers).values(videoProjectMembers);
  await db.insert(projectMembers).values(pitchProjectMembers);

  // Create columns for video project
  const videoColumns: InsertColumn[] = [
    { projectId: videoProjectData.id, name: "Ideation", color: "#4F46E5", order: 0 },
    { projectId: videoProjectData.id, name: "Pre-Production", color: "#06B6D4", order: 1 },
    { projectId: videoProjectData.id, name: "Production", color: "#10B981", order: 2 },
    { projectId: videoProjectData.id, name: "Post-Production", color: "#EF4444", order: 3 },
  ];

  console.log("Creating columns for video project...");
  const createdVideoColumns = await Promise.all(
    videoColumns.map(async (column) => {
      const [createdColumn] = await db.insert(columns).values(column).returning();
      return createdColumn;
    })
  );

  // Create columns for pitch project
  const pitchColumns: InsertColumn[] = [
    { projectId: pitchProjectData.id, name: "Research", color: "#EF4444", order: 0 },
    { projectId: pitchProjectData.id, name: "Drafting", color: "#F59E0B", order: 1 },
    { projectId: pitchProjectData.id, name: "Review", color: "#10B981", order: 2 },
    { projectId: pitchProjectData.id, name: "Final", color: "#4F46E5", order: 3 },
  ];

  console.log("Creating columns for pitch project...");
  const createdPitchColumns = await Promise.all(
    pitchColumns.map(async (column) => {
      const [createdColumn] = await db.insert(columns).values(column).returning();
      return createdColumn;
    })
  );

  // Add content to video project columns
  const videoContents: InsertContent[] = [
    {
      title: "Research latest AI trends",
      description: "Gather information on recent breakthroughs in AI and longevity research",
      type: "research",
      columnId: createdVideoColumns[0].id,
      projectId: videoProjectData.id,
      assignedTo: johnDoeUser.id,
      priority: "high",
      order: 0,
      createdBy: johnDoeUser.id,
    },
    {
      title: "Create script outline",
      description: "Develop the main talking points and structure for the video",
      type: "script",
      columnId: createdVideoColumns[0].id,
      projectId: videoProjectData.id,
      assignedTo: janeDoeUser.id,
      priority: "medium",
      order: 1,
      createdBy: johnDoeUser.id,
    },
    {
      title: "Find interview subjects",
      description: "Contact researchers and experts for potential interviews",
      type: "task",
      columnId: createdVideoColumns[1].id,
      projectId: videoProjectData.id,
      assignedTo: bobSmithUser.id,
      priority: "high",
      order: 0,
      createdBy: janeDoeUser.id,
    },
    {
      title: "Location scouting",
      description: "Find appropriate lab settings for filming",
      type: "task",
      columnId: createdVideoColumns[1].id,
      projectId: videoProjectData.id,
      assignedTo: johnDoeUser.id,
      priority: "low",
      order: 1,
      createdBy: bobSmithUser.id,
    },
  ];

  console.log("Adding content to video project...");
  for (const content of videoContents) {
    await db.insert(contents).values(content);
  }

  // Add content to pitch project columns
  const pitchContents: InsertContent[] = [
    {
      title: "Market analysis",
      description: "Research current market trends and competitor products",
      type: "research",
      columnId: createdPitchColumns[0].id,
      projectId: pitchProjectData.id,
      assignedTo: bobSmithUser.id,
      priority: "high",
      order: 0,
      createdBy: janeDoeUser.id,
    },
    {
      title: "Value proposition",
      description: "Define clear value proposition for the product",
      type: "task",
      columnId: createdPitchColumns[0].id,
      projectId: pitchProjectData.id,
      assignedTo: janeDoeUser.id,
      priority: "high",
      order: 1,
      createdBy: janeDoeUser.id,
    },
    {
      title: "Create pitch deck",
      description: "Design initial slide deck for the pitch video",
      type: "task",
      columnId: createdPitchColumns[1].id,
      projectId: pitchProjectData.id,
      assignedTo: johnDoeUser.id,
      priority: "medium",
      order: 0,
      createdBy: bobSmithUser.id,
    },
  ];

  console.log("Adding content to pitch project...");
  for (const content of pitchContents) {
    await db.insert(contents).values(content);
  }

  console.log("Database initialization complete!");
}

main()
  .catch((e) => {
    console.error("Error initializing database:", e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });