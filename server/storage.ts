import { 
  users, type User, type InsertUser,
  projects, type Project, type InsertProject,
  projectMembers, type ProjectMember, type InsertProjectMember,
  columns, type Column, type InsertColumn,
  contents, type Content, type InsertContent,
  attachments, type Attachment, type InsertAttachment
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  
  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  getProjectWithMembers(id: number): Promise<ProjectWithMembers | undefined>;
  getProjectsByUserId(userId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Project members operations
  addProjectMember(projectMember: InsertProjectMember): Promise<ProjectMember>;
  removeProjectMember(projectId: number, userId: number): Promise<boolean>;
  getProjectMembers(projectId: number): Promise<User[]>;
  
  // Column operations
  getColumns(projectId: number): Promise<Column[]>;
  getColumnWithContents(columnId: number): Promise<ColumnWithContents | undefined>;
  createColumn(column: InsertColumn): Promise<Column>;
  updateColumn(id: number, column: Partial<InsertColumn>): Promise<Column | undefined>;
  deleteColumn(id: number): Promise<boolean>;
  
  // Content operations
  getContent(id: number): Promise<Content | undefined>;
  getContentByProject(projectId: number): Promise<Content[]>;
  getContentByColumn(columnId: number): Promise<Content[]>;
  getContentWithAssignee(id: number): Promise<ContentWithAssignee | undefined>;
  createContent(content: InsertContent): Promise<Content>;
  updateContent(id: number, content: Partial<InsertContent>): Promise<Content | undefined>;
  moveContent(id: number, newColumnId: number, newOrder: number): Promise<Content | undefined>;
  deleteContent(id: number): Promise<boolean>;
  
  // Attachment operations
  getAttachments(contentId: number): Promise<Attachment[]>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: number): Promise<boolean>;
}

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

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectWithMembers(id: number): Promise<ProjectWithMembers | undefined> {
    const project = await this.getProject(id);
    if (!project) return undefined;

    const members = await this.getProjectMembers(id);
    return { ...project, members };
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    // Get projects created by user
    const userProjects = await db.select().from(projects).where(eq(projects.createdBy, userId));
    
    // Get projects where user is a member
    const userMemberships = await db.select({
      projectId: projectMembers.projectId
    }).from(projectMembers).where(eq(projectMembers.userId, userId));
    
    const memberProjectIds = userMemberships.map(m => m.projectId);
    
    // If no member projects, just return user's own projects
    if (memberProjectIds.length === 0) {
      return userProjects;
    }

    // Get the member projects (excluding any already in userProjects)
    const memberProjects = await db.select()
      .from(projects)
      .where(and(
        projects.id.in(memberProjectIds),
        projects.createdBy !== userId
      ));
    
    return [...userProjects, ...memberProjects];
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    // First, delete related content, members, and columns
    try {
      // Get columns for this project
      const projectColumns = await db.select().from(columns).where(eq(columns.projectId, id));
      const columnIds = projectColumns.map(c => c.id);
      
      // Delete contents in these columns
      if (columnIds.length > 0) {
        await db.delete(contents).where(contents.columnId.in(columnIds));
      }
      
      // Delete columns
      await db.delete(columns).where(eq(columns.projectId, id));
      
      // Delete project members
      await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
      
      // Finally delete the project
      await db.delete(projects).where(eq(projects.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting project:", error);
      return false;
    }
  }

  // Project members operations
  async addProjectMember(insertProjectMember: InsertProjectMember): Promise<ProjectMember> {
    const [projectMember] = await db
      .insert(projectMembers)
      .values(insertProjectMember)
      .returning();
    return projectMember;
  }

  async removeProjectMember(projectId: number, userId: number): Promise<boolean> {
    try {
      await db.delete(projectMembers).where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      );
      return true;
    } catch (error) {
      console.error("Error removing project member:", error);
      return false;
    }
  }

  async getProjectMembers(projectId: number): Promise<User[]> {
    const memberships = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
    
    if (memberships.length === 0) {
      return [];
    }
    
    const userIds = memberships.map(m => m.userId);
    return await db.select().from(users).where(users.id.in(userIds));
  }

  // Column operations
  async getColumns(projectId: number): Promise<Column[]> {
    return await db
      .select()
      .from(columns)
      .where(eq(columns.projectId, projectId))
      .orderBy(columns.order);
  }

  async getColumnWithContents(columnId: number): Promise<ColumnWithContents | undefined> {
    const [column] = await db.select().from(columns).where(eq(columns.id, columnId));
    if (!column) return undefined;

    const columnContents = await this.getContentByColumn(columnId);
    
    // Get assignees and attachment counts for each content
    const contentsWithAssignees: ContentWithAssignee[] = await Promise.all(
      columnContents.map(async (content) => {
        const contentWithAssignee = await this.getContentWithAssignee(content.id);
        return contentWithAssignee || content;
      })
    );
    
    return {
      ...column,
      contents: contentsWithAssignees
    };
  }

  async createColumn(insertColumn: InsertColumn): Promise<Column> {
    const [column] = await db
      .insert(columns)
      .values(insertColumn)
      .returning();
    return column;
  }

  async updateColumn(id: number, updates: Partial<InsertColumn>): Promise<Column | undefined> {
    const [updatedColumn] = await db
      .update(columns)
      .set(updates)
      .where(eq(columns.id, id))
      .returning();
    return updatedColumn;
  }

  async deleteColumn(id: number): Promise<boolean> {
    try {
      // First delete all contents in this column
      await db.delete(contents).where(eq(contents.columnId, id));
      
      // Then delete the column
      await db.delete(columns).where(eq(columns.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting column:", error);
      return false;
    }
  }

  // Content operations
  async getContent(id: number): Promise<Content | undefined> {
    const [content] = await db.select().from(contents).where(eq(contents.id, id));
    return content;
  }

  async getContentByProject(projectId: number): Promise<Content[]> {
    const projectColumns = await this.getColumns(projectId);
    const columnIds = projectColumns.map(c => c.id);
    
    if (columnIds.length === 0) {
      return [];
    }
    
    return await db
      .select()
      .from(contents)
      .where(contents.columnId.in(columnIds))
      .orderBy(contents.order);
  }

  async getContentByColumn(columnId: number): Promise<Content[]> {
    return await db
      .select()
      .from(contents)
      .where(eq(contents.columnId, columnId))
      .orderBy(contents.order);
  }

  async getContentWithAssignee(id: number): Promise<ContentWithAssignee | undefined> {
    const content = await this.getContent(id);
    if (!content) return undefined;
    
    let assignee: User | undefined;
    if (content.assignedTo) {
      assignee = await this.getUser(content.assignedTo);
    }
    
    // Count attachments
    const attachmentList = await this.getAttachments(id);
    const attachmentCount = attachmentList.length;
    
    return {
      ...content,
      assignee,
      attachmentCount
    };
  }

  async createContent(insertContent: InsertContent): Promise<Content> {
    const [content] = await db
      .insert(contents)
      .values(insertContent)
      .returning();
    return content;
  }

  async updateContent(id: number, updates: Partial<InsertContent>): Promise<Content | undefined> {
    const [updatedContent] = await db
      .update(contents)
      .set(updates)
      .where(eq(contents.id, id))
      .returning();
    return updatedContent;
  }

  async moveContent(id: number, newColumnId: number, newOrder: number): Promise<Content | undefined> {
    // Get the content to move
    const content = await this.getContent(id);
    if (!content) return undefined;
    
    const oldColumnId = content.columnId;
    
    // Update the content's column and order
    const [movedContent] = await db
      .update(contents)
      .set({
        columnId: newColumnId,
        order: newOrder
      })
      .where(eq(contents.id, id))
      .returning();
    
    // Reorder contents in old column
    const oldColumnContents = await this.getContentByColumn(oldColumnId);
    for (let i = 0; i < oldColumnContents.length; i++) {
      await db
        .update(contents)
        .set({ order: i })
        .where(eq(contents.id, oldColumnContents[i].id));
    }
    
    // Reorder contents in new column
    const newColumnContents = await this.getContentByColumn(newColumnId);
    for (let i = 0; i < newColumnContents.length; i++) {
      if (i !== newOrder) { // Skip the already updated content
        await db
          .update(contents)
          .set({ order: i >= newOrder ? i + 1 : i })
          .where(eq(contents.id, newColumnContents[i].id));
      }
    }
    
    return movedContent;
  }

  async deleteContent(id: number): Promise<boolean> {
    try {
      // First delete attachments
      await db.delete(attachments).where(eq(attachments.contentId, id));
      
      // Then delete the content
      await db.delete(contents).where(eq(contents.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting content:", error);
      return false;
    }
  }

  // Attachment operations
  async getAttachments(contentId: number): Promise<Attachment[]> {
    return await db
      .select()
      .from(attachments)
      .where(eq(attachments.contentId, contentId));
  }

  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const [attachment] = await db
      .insert(attachments)
      .values(insertAttachment)
      .returning();
    return attachment;
  }

  async deleteAttachment(id: number): Promise<boolean> {
    try {
      await db.delete(attachments).where(eq(attachments.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting attachment:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();