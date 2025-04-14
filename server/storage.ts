import { 
  users, type User, type InsertUser,
  projects, type Project, type InsertProject,
  projectMembers, type ProjectMember, type InsertProjectMember,
  columns, type Column, type InsertColumn,
  contents, type Content, type InsertContent,
  attachments, type Attachment, type InsertAttachment,
  youtubeVideos, type YoutubeVideo, type InsertYoutubeVideo,
  projectFiles, type ProjectFile, type InsertProjectFile,
  projectFolders, type ProjectFolder, type InsertProjectFolder,
  scriptData, type ScriptData, type InsertScriptData,
  type ScriptCorrelation, type SpreadsheetRow,
  type ProjectFolderWithParent, type ProjectFileWithFolder
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
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
  
  // YouTube video operations
  getYoutubeVideo(id: number): Promise<YoutubeVideo | undefined>;
  getYoutubeVideosByProject(projectId: number): Promise<YoutubeVideo[]>;
  createYoutubeVideo(video: InsertYoutubeVideo): Promise<YoutubeVideo>;
  updateYoutubeVideo(id: number, video: Partial<InsertYoutubeVideo>): Promise<YoutubeVideo | undefined>;
  deleteYoutubeVideo(id: number): Promise<boolean>;
  
  // Project file operations
  getProjectFile(id: number): Promise<ProjectFile | undefined>;
  getProjectFilesByProject(projectId: number): Promise<ProjectFile[]>;
  getProjectFilesByFolder(folderId: number | null): Promise<ProjectFile[]>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  updateProjectFile(id: number, file: Partial<InsertProjectFile>): Promise<ProjectFile | undefined>;
  deleteProjectFile(id: number): Promise<boolean>;
  
  // Project folder operations
  getProjectFolder(id: number): Promise<ProjectFolder | undefined>;
  getProjectFolderWithContents(id: number | null, projectId: number): Promise<ProjectFolderWithParent | undefined>;
  getProjectFoldersByProject(projectId: number): Promise<ProjectFolder[]>;
  getProjectSubfolders(parentId: number | null, projectId: number): Promise<ProjectFolder[]>;
  createProjectFolder(folder: InsertProjectFolder): Promise<ProjectFolder>;
  updateProjectFolder(id: number, folder: Partial<InsertProjectFolder>): Promise<ProjectFolder | undefined>;
  deleteProjectFolder(id: number): Promise<boolean>;
  
  // Script data operations
  getScriptData(projectId: number): Promise<ScriptData | undefined>;
  createScriptData(data: InsertScriptData): Promise<ScriptData>;
  updateScriptData(projectId: number, data: Partial<InsertScriptData>): Promise<ScriptData | undefined>;
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
  
  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      // Remove user from all project members
      await db.delete(projectMembers).where(eq(projectMembers.userId, id));
      
      // Remove assignee references in content
      await db
        .update(contents)
        .set({ assignedTo: null })
        .where(eq(contents.assignedTo, id));
      
      // Remove user
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
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
    try {
      console.log(`Getting projects for user ID: ${userId}`);
      
      // Get projects created by user
      const userProjects = await db.select().from(projects).where(eq(projects.createdBy, userId));
      console.log(`Found ${userProjects.length} projects created by user`);
      
      // Get projects where user is a member
      const userMemberships = await db.select({
        projectId: projectMembers.projectId
      }).from(projectMembers).where(eq(projectMembers.userId, userId));
      
      const memberProjectIds = userMemberships.map(m => m.projectId);
      console.log(`User is a member of ${memberProjectIds.length} projects`);
      
      // If no member projects, just return user's own projects
      if (memberProjectIds.length === 0) {
        return userProjects;
      }

      // Get all the member projects
      const allMemberProjects = memberProjectIds.length > 0 
        ? await db.select().from(projects).where(
            sql`${projects.id} IN (${memberProjectIds.join(',')})`
          )
        : [];
        
      // Filter out any projects already in userProjects (created by the user)
      const ownProjectIds = new Set(userProjects.map(p => p.id));
      const memberProjects = allMemberProjects.filter(p => !ownProjectIds.has(p.id));
      
      console.log(`Returning ${userProjects.length + memberProjects.length} total projects`);
      return [...userProjects, ...memberProjects];
    } catch (error) {
      console.error("Error in getProjectsByUserId:", error);
      throw error;
    }
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
        await db.delete(contents).where(
          sql`${contents.columnId} IN (${columnIds.join(',')})`
        );
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
    if (userIds.length === 0) return [];
    return await db.select().from(users).where(
      sql`${users.id} IN (${userIds.join(',')})`
    );
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
    try {
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
    } catch (error) {
      console.error(`Error in getColumnWithContents for columnId ${columnId}:`, error);
      throw error;
    }
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
      .where(
        sql`${contents.columnId} IN (${columnIds.join(',')})`
      )
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
  
  // YouTube video operations
  async getYoutubeVideo(id: number): Promise<YoutubeVideo | undefined> {
    const [video] = await db.select().from(youtubeVideos).where(eq(youtubeVideos.id, id));
    return video;
  }
  
  async getYoutubeVideosByProject(projectId: number): Promise<YoutubeVideo[]> {
    return await db
      .select()
      .from(youtubeVideos)
      .where(eq(youtubeVideos.projectId, projectId))
      .orderBy(youtubeVideos.createdAt);
  }
  
  async createYoutubeVideo(insertVideo: InsertYoutubeVideo): Promise<YoutubeVideo> {
    const [video] = await db
      .insert(youtubeVideos)
      .values(insertVideo)
      .returning();
    return video;
  }
  
  async updateYoutubeVideo(id: number, updates: Partial<InsertYoutubeVideo>): Promise<YoutubeVideo | undefined> {
    const [updatedVideo] = await db
      .update(youtubeVideos)
      .set({
        ...updates,
        updatedAt: new Date() // Always update the updatedAt field
      })
      .where(eq(youtubeVideos.id, id))
      .returning();
    return updatedVideo;
  }
  
  async deleteYoutubeVideo(id: number): Promise<boolean> {
    try {
      await db.delete(youtubeVideos).where(eq(youtubeVideos.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting YouTube video:", error);
      return false;
    }
  }

  // Project file operations
  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, id));
    return file;
  }

  async getProjectFilesByProject(projectId: number): Promise<ProjectFile[]> {
    return await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId));
  }

  async getProjectFilesByFolder(folderId: number | null): Promise<ProjectFile[]> {
    if (folderId === null) {
      // Root folder (null parentId)
      return await db
        .select()
        .from(projectFiles)
        .where(sql`${projectFiles.folderId} IS NULL`);
    } else {
      return await db
        .select()
        .from(projectFiles)
        .where(eq(projectFiles.folderId, folderId));
    }
  }

  async createProjectFile(insertFile: InsertProjectFile): Promise<ProjectFile> {
    const [file] = await db
      .insert(projectFiles)
      .values(insertFile)
      .returning();
    return file;
  }

  async updateProjectFile(id: number, updates: Partial<InsertProjectFile>): Promise<ProjectFile | undefined> {
    const [updatedFile] = await db
      .update(projectFiles)
      .set(updates)
      .where(eq(projectFiles.id, id))
      .returning();
    return updatedFile;
  }

  async deleteProjectFile(id: number): Promise<boolean> {
    try {
      await db.delete(projectFiles).where(eq(projectFiles.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting project file:", error);
      return false;
    }
  }

  // Project folder operations
  async getProjectFolder(id: number): Promise<ProjectFolder | undefined> {
    const [folder] = await db.select().from(projectFolders).where(eq(projectFolders.id, id));
    return folder;
  }

  async getProjectFolderWithContents(id: number | null, projectId: number): Promise<ProjectFolderWithParent | undefined> {
    try {
      let folder: ProjectFolder | undefined;
      let parent: ProjectFolder | undefined;
      
      if (id === null) {
        // Root folder case (virtual folder)
        folder = {
          id: 0,
          projectId,
          name: "Root",
          parentId: null,
          createdAt: new Date(),
          createdBy: 0
        };
      } else {
        // Real folder from database
        const [dbFolder] = await db.select().from(projectFolders).where(eq(projectFolders.id, id));
        if (!dbFolder) return undefined;
        folder = dbFolder;
        
        // Get parent folder if exists
        if (folder.parentId) {
          const [parentFolder] = await db.select().from(projectFolders).where(eq(projectFolders.id, folder.parentId));
          parent = parentFolder;
        }
      }
      
      // Get files in this folder
      const files = await this.getProjectFilesByFolder(id);
      
      // Get subfolders
      const subfolders = await this.getProjectSubfolders(id, projectId);
      
      return {
        ...folder,
        parent,
        files,
        subfolders
      };
    } catch (error) {
      console.error(`Error in getProjectFolderWithContents for id ${id}:`, error);
      return undefined;
    }
  }

  async getProjectFoldersByProject(projectId: number): Promise<ProjectFolder[]> {
    return await db
      .select()
      .from(projectFolders)
      .where(eq(projectFolders.projectId, projectId));
  }

  async getProjectSubfolders(parentId: number | null, projectId: number): Promise<ProjectFolder[]> {
    if (parentId === null) {
      // Root folders (null parentId)
      return await db
        .select()
        .from(projectFolders)
        .where(
          and(
            eq(projectFolders.projectId, projectId),
            sql`${projectFolders.parentId} IS NULL`
          )
        );
    } else {
      return await db
        .select()
        .from(projectFolders)
        .where(
          and(
            eq(projectFolders.projectId, projectId),
            eq(projectFolders.parentId, parentId)
          )
        );
    }
  }

  async createProjectFolder(insertFolder: InsertProjectFolder): Promise<ProjectFolder> {
    const [folder] = await db
      .insert(projectFolders)
      .values(insertFolder)
      .returning();
    return folder;
  }

  async updateProjectFolder(id: number, updates: Partial<InsertProjectFolder>): Promise<ProjectFolder | undefined> {
    const [updatedFolder] = await db
      .update(projectFolders)
      .set(updates)
      .where(eq(projectFolders.id, id))
      .returning();
    return updatedFolder;
  }

  async deleteProjectFolder(id: number): Promise<boolean> {
    try {
      // First move all files in this folder to root (null folder)
      await db
        .update(projectFiles)
        .set({ folderId: null })
        .where(eq(projectFiles.folderId, id));
      
      // Delete the folder
      await db.delete(projectFolders).where(eq(projectFolders.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting project folder:", error);
      return false;
    }
  }
  // Script data operations
  async getScriptData(projectId: number): Promise<ScriptData | undefined> {
    const [data] = await db
      .select()
      .from(scriptData)
      .where(eq(scriptData.projectId, projectId));
    return data;
  }

  async createScriptData(insertData: InsertScriptData): Promise<ScriptData> {
    const [data] = await db
      .insert(scriptData)
      .values(insertData)
      .returning();
    return data;
  }

  async updateScriptData(projectId: number, updates: Partial<InsertScriptData>): Promise<ScriptData | undefined> {
    // Check if a script data entry exists for this project
    const existing = await this.getScriptData(projectId);
    
    if (existing) {
      // Update existing script data
      const [updatedData] = await db
        .update(scriptData)
        .set({
          ...updates,
          updatedAt: new Date() // Ensure the updatedAt field is set
        })
        .where(eq(scriptData.projectId, projectId))
        .returning();
      return updatedData;
    } else {
      // Create new script data entry if it doesn't exist
      if (!updates.scriptContent || !updates.correlations || !updates.spreadsheetData || !updates.createdBy) {
        throw new Error("Missing required fields for script data creation");
      }
      
      return await this.createScriptData({
        projectId,
        scriptContent: updates.scriptContent,
        finalContent: updates.finalContent || "",
        correlations: updates.correlations,
        spreadsheetData: updates.spreadsheetData,
        createdBy: updates.createdBy
      });
    }
  }
}

export const storage = new DatabaseStorage();