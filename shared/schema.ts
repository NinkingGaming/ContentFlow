import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define user roles as an enum
export const UserRole = {
  ADMIN: "admin",         // Can do anything
  PRODUCER: "producer",   // Can create and edit projects they create or are added to
  ACTOR: "actor",         // Can pitch ideas on projects they're added to
  EMPLOYED: "employed"    // Can only view projects they're added to
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  avatarInitials: text("avatar_initials").notNull(),
  avatarColor: text("avatar_color").notNull(),
  role: text("role").notNull().default(UserRole.EMPLOYED),  // Default role is EMPLOYED
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  director: text("director"),
  writer: text("writer"),
  actors: text("actors"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

// Project members table
export const projectMembers = pgTable("project_members", {
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.projectId, table.userId] }),
  };
});

export const insertProjectMemberSchema = createInsertSchema(projectMembers);

// Columns table
export const columns = pgTable("columns", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  color: text("color").notNull(),
  order: integer("order").notNull(),
  width: integer("width").default(1), // Default width is 1, Pitches column will be 2
});

export const insertColumnSchema = createInsertSchema(columns).omit({
  id: true,
});

// Content table
export const contents = pgTable("contents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  columnId: integer("column_id").notNull().references(() => columns.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  priority: text("priority"),
  progress: integer("progress").default(0),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

export const insertContentSchema = createInsertSchema(contents).omit({
  id: true,
  createdAt: true,
  order: true, // Order will be set by the server
});

// Attachments table
export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull().references(() => contents.id),
  name: text("name").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true,
});

// Project files table
export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  filepath: text("filepath").notNull(),
  mimetype: text("mimetype").notNull(),
  size: integer("size").notNull(),
  isPublic: boolean("is_public").default(false),
  folderId: integer("folder_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Project folders table
export const projectFolders = pgTable("project_folders", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

export const insertProjectFolderSchema = createInsertSchema(projectFolders).omit({
  id: true,
  createdAt: true,
});

// YouTube video metadata table
export const youtubeVideos = pgTable("youtube_videos", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  tags: text("tags").array(),
  thumbnailUrl: text("thumbnail_url"),
  videoUrl: text("video_url"),
  visibility: text("visibility").default("private"),
  category: text("category"),
  playlist: text("playlist"),
  scheduledPublishTime: timestamp("scheduled_publish_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertYoutubeVideoSchema = createInsertSchema(youtubeVideos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Script data table
export const scriptData = pgTable("script_data", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  scriptContent: text("script_content").notNull(),
  finalContent: text("final_content"),
  correlations: jsonb("correlations").notNull(),
  spreadsheetData: jsonb("spreadsheet_data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertScriptDataSchema = createInsertSchema(scriptData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Chat Channels
export const chatChannels = pgTable("chat_channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isPrivate: boolean("is_private").notNull().default(false),
  isDirectMessage: boolean("is_direct_message").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

export const insertChatChannelSchema = createInsertSchema(chatChannels).omit({
  id: true,
  createdAt: true,
});

// Chat Channel Members
export const chatChannelMembers = pgTable("chat_channel_members", {
  channelId: integer("channel_id").notNull().references(() => chatChannels.id),
  userId: integer("user_id").notNull().references(() => users.id),
  isAdmin: boolean("is_admin").notNull().default(false),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.channelId, table.userId] }),
  }
});

export const insertChatChannelMemberSchema = createInsertSchema(chatChannelMembers).omit({
  joinedAt: true,
});

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => chatChannels.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  sentAt: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;

export type Column = typeof columns.$inferSelect;
export type InsertColumn = z.infer<typeof insertColumnSchema>;

export type Content = typeof contents.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

export type YoutubeVideo = typeof youtubeVideos.$inferSelect;
export type InsertYoutubeVideo = z.infer<typeof insertYoutubeVideoSchema>;

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;

export type ProjectFolder = typeof projectFolders.$inferSelect;
export type InsertProjectFolder = z.infer<typeof insertProjectFolderSchema>;

// Custom types for the UI
export type ProjectWithMembers = Project & {
  members: User[];
};

export type ColumnWithContents = Column & {
  contents: ContentWithAssignee[];
};

export type ContentWithAssignee = Content & {
  assignee?: User;
  attachmentCount?: number;
};

export type ProjectFileWithFolder = ProjectFile & {
  folder?: ProjectFolder;
};

export type ProjectFolderWithParent = ProjectFolder & {
  parent?: ProjectFolder;
  files?: ProjectFile[];
  subfolders?: ProjectFolder[];
};

export type ScriptData = typeof scriptData.$inferSelect;
export type InsertScriptData = z.infer<typeof insertScriptDataSchema>;

export type ChatChannel = typeof chatChannels.$inferSelect;
export type InsertChatChannel = z.infer<typeof insertChatChannelSchema>;

export type ChatChannelMember = typeof chatChannelMembers.$inferSelect;
export type InsertChatChannelMember = z.infer<typeof insertChatChannelMemberSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Custom chat types
export type ChatChannelWithMembers = ChatChannel & {
  members: User[];
};

export type ChatMessageWithSender = ChatMessage & {
  sender: User;
};

// Published finals table
export const publishedFinals = pgTable("published_finals", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  version: integer("version").notNull(),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  publishedBy: integer("published_by").notNull().references(() => users.id),
});

export const insertPublishedFinalSchema = createInsertSchema(publishedFinals).omit({
  id: true,
  publishedAt: true,
});

export type PublishedFinal = typeof publishedFinals.$inferSelect & {
  creatorDisplayName?: string;
  createdAt?: string;
};
export type InsertPublishedFinal = z.infer<typeof insertPublishedFinalSchema>;

// Custom script data types
export interface ScriptCorrelation {
  textId: string;
  shotNumber: number;
  text: string;
}

export interface SpreadsheetRow {
  id: number;
  generalData: string;
  shotNumber: number;
  shotData1: string; // Slug
  shotData2: string; // On-Screen
  shotData3: string; // Cam. Op.
  shotData4: string; // Location
  hasCorrelation: boolean;
}
