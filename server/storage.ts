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
  type ProjectFolderWithParent, type ProjectFileWithFolder,
  chatChannels, type ChatChannel, type InsertChatChannel,
  chatChannelMembers, type ChatChannelMember, type InsertChatChannelMember,
  chatMessages, type ChatMessage, type InsertChatMessage,
  type ChatMessageWithSender, type ChatChannelWithMembers,
  UserRole
} from "@shared/schema";
import { db, pool } from "./db";
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
  
  // Chat operations
  getChatChannel(id: number): Promise<ChatChannel | undefined>;
  getChatChannelWithMembers(id: number): Promise<ChatChannelWithMembers | undefined>;
  getChatChannelByUsers(userIds: number[]): Promise<ChatChannel | undefined>;
  getChatChannels(): Promise<ChatChannel[]>;
  getChatChannelsByUser(userId: number): Promise<ChatChannel[]>;
  createChatChannel(channel: InsertChatChannel): Promise<ChatChannel>;
  updateChatChannel(id: number, channel: Partial<InsertChatChannel>): Promise<ChatChannel | undefined>;
  deleteChatChannel(id: number): Promise<boolean>;
  
  // Chat channel members operations
  addChatChannelMember(member: InsertChatChannelMember): Promise<ChatChannelMember>;
  removeChatChannelMember(channelId: number, userId: number): Promise<boolean>;
  getChatChannelMembers(channelId: number): Promise<User[]>;
  
  // Chat messages operations
  getChatMessages(channelId: number): Promise<ChatMessageWithSender[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
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
    const client = await pool.connect();
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      console.log(`Deleting user with ID: ${id}`);
      
      // Find all content created by this user
      const contentsCreatedByUser = await client.query(`
        SELECT id FROM contents WHERE created_by = $1
      `, [id]);
      
      console.log(`Found ${contentsCreatedByUser.rowCount} contents created by this user`);
      
      // Reassign all content created by this user to mastercontrol (id=6)
      if (contentsCreatedByUser && contentsCreatedByUser.rowCount && contentsCreatedByUser.rowCount > 0) {
        await client.query(`
          UPDATE contents SET created_by = 6 WHERE created_by = $1
        `, [id]);
        console.log(`Reassigned all content to mastercontrol`);
      }
      
      // Clear assignee references
      await client.query(`
        UPDATE contents SET assigned_to = NULL WHERE assigned_to = $1
      `, [id]);
      
      // Fix script data references
      await client.query(`
        UPDATE script_data SET created_by = 6 WHERE created_by = $1
      `, [id]);
      
      // Fix project files references
      await client.query(`
        UPDATE project_files SET created_by = 6 WHERE created_by = $1
      `, [id]);
      
      // Fix project folders references
      await client.query(`
        UPDATE project_folders SET created_by = 6 WHERE created_by = $1
      `, [id]);
      
      // Find projects created by this user
      const userProjects = await client.query(`
        SELECT id FROM projects WHERE created_by = $1
      `, [id]);
      
      console.log(`Found ${userProjects.rowCount} projects created by this user`);
      
      // For each project created by this user, either delete it or reassign it
      if (userProjects && userProjects.rowCount && userProjects.rowCount > 0) {
        // Option: Reassign projects to mastercontrol (id=6)
        await client.query(`
          UPDATE projects SET created_by = 6 WHERE created_by = $1
        `, [id]);
        console.log(`Reassigned all projects to mastercontrol`);
      }
      
      // Remove from project members
      await client.query(`
        DELETE FROM project_members WHERE user_id = $1
      `, [id]);
      
      // Finally delete the user
      await client.query(`
        DELETE FROM users WHERE id = $1
      `, [id]);
      
      // If we got here without errors, commit the transaction
      await client.query('COMMIT');
      console.log(`Successfully deleted user ${id}`);
      return true;
    } catch (error) {
      // If any error occurs, rollback the transaction
      await client.query('ROLLBACK');
      console.error("Error deleting user:", error);
      return false;
    } finally {
      // Always release the client back to the pool
      client.release();
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
      
      // First check if the user is an admin
      const user = await this.getUser(userId);
      if (user && user.role === UserRole.ADMIN) {
        // Admin users can see all projects in the system
        console.log(`User is an admin - returning ALL projects`);
        const allProjects = await db.select().from(projects);
        return allProjects;
      }
      
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
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Insert the project
      const projectResult = await client.query(`
        INSERT INTO projects (name, description, type, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        insertProject.name, 
        insertProject.description, 
        insertProject.type, 
        insertProject.createdBy, 
        new Date()
      ]);
      
      const project = projectResult.rows[0];
      
      // Get all admin users
      const adminUsers = await client.query(`
        SELECT id FROM users WHERE role = $1
      `, [UserRole.ADMIN]);
      
      console.log(`Found ${adminUsers.rowCount} admin users to add to project ${project.id}`);
      
      // Add all admin users to the project
      for (const adminUser of adminUsers.rows) {
        await client.query(`
          INSERT INTO project_members (project_id, user_id)
          VALUES ($1, $2)
          ON CONFLICT (project_id, user_id) DO NOTHING
        `, [project.id, adminUser.id]);
      }
      
      // Add the creator if they're not an admin (they're already added if admin)
      const creatorResult = await client.query(`
        SELECT id, role FROM users WHERE id = $1
      `, [insertProject.createdBy]);
      
      if (creatorResult && creatorResult.rowCount && creatorResult.rowCount > 0) {
        const creator = creatorResult.rows[0];
        if (creator.role !== UserRole.ADMIN) {
          await client.query(`
            INSERT INTO project_members (project_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (project_id, user_id) DO NOTHING
          `, [project.id, creator.id]);
        }
      }
      
      // Create default columns for the project
      const defaultColumns = [
        { name: 'Ideation', order: 0 },
        { name: 'Pre-Production', order: 1 },
        { name: 'Production', order: 2 },
        { name: 'Post-Production', order: 3 }
      ];
      
      for (const column of defaultColumns) {
        await client.query(`
          INSERT INTO columns (name, project_id, "order")
          VALUES ($1, $2, $3)
        `, [column.name, project.id, column.order]);
      }
      
      // Commit the transaction
      await client.query('COMMIT');
      
      return project;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating project:', error);
      throw error;
    } finally {
      client.release();
    }
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
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      console.log(`Deleting project with ID: ${id}`);
      
      // Get columns for this project
      const projectColumns = await client.query(`
        SELECT id FROM columns WHERE project_id = $1
      `, [id]);
      
      const columnIds = projectColumns.rows.map(c => c.id);
      console.log(`Found ${columnIds.length} columns to delete`);
      
      // Delete contents in these columns
      if (columnIds.length > 0) {
        const contentIdsResult = await client.query(`
          SELECT id FROM contents WHERE column_id IN (${columnIds.join(',')})
        `);
        
        const contentIds = contentIdsResult.rows.map(c => c.id);
        console.log(`Found ${contentIds.length} contents to delete`);
        
        if (contentIds.length > 0) {
          // Delete attachments for these contents
          await client.query(`
            DELETE FROM attachments WHERE content_id IN (${contentIds.join(',')})
          `);
        }
        
        // Delete all contents in these columns
        await client.query(`
          DELETE FROM contents WHERE column_id IN (${columnIds.join(',')})
        `);
      }
      
      // Delete columns
      await client.query(`
        DELETE FROM columns WHERE project_id = $1
      `, [id]);
      
      // Delete project members
      await client.query(`
        DELETE FROM project_members WHERE project_id = $1
      `, [id]);
      
      // Delete project files
      await client.query(`
        DELETE FROM project_files WHERE project_id = $1
      `, [id]);
      
      // Delete project folders
      await client.query(`
        DELETE FROM project_folders WHERE project_id = $1
      `, [id]);
      
      // Delete YouTube videos
      await client.query(`
        DELETE FROM youtube_videos WHERE project_id = $1
      `, [id]);
      
      // Delete script data
      await client.query(`
        DELETE FROM script_data WHERE project_id = $1
      `, [id]);
      
      // Finally delete the project
      await client.query(`
        DELETE FROM projects WHERE id = $1
      `, [id]);
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log(`Successfully deleted project ${id}`);
      return true;
    } catch (error) {
      // If any error occurs, rollback the transaction
      await client.query('ROLLBACK');
      console.error("Error deleting project:", error);
      return false;
    } finally {
      // Always release the client back to the pool
      client.release();
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
    try {
      console.log("Storage: Creating column with data:", JSON.stringify(insertColumn));
      
      // Use direct SQL query instead of ORM to ensure we have explicit control
      const client = await pool.connect();
      try {
        // Start transaction
        await client.query('BEGIN');
        
        console.log(`Creating column with direct SQL: projectId=${insertColumn.projectId}, name=${insertColumn.name}, color=${insertColumn.color}, order=${insertColumn.order}`);
        
        // Insert using parameterized query
        const result = await client.query(
          `INSERT INTO columns (project_id, name, color, "order") 
           VALUES ($1, $2, $3, $4) 
           RETURNING id, project_id AS "projectId", name, color, "order"`,
          [insertColumn.projectId, insertColumn.name, insertColumn.color, insertColumn.order]
        );
        
        // Commit transaction
        await client.query('COMMIT');
        
        const column = result.rows[0];
        console.log("Storage: Column created successfully:", JSON.stringify(column));
        return column;
      } catch (error) {
        // Rollback in case of error
        await client.query('ROLLBACK');
        console.error("Storage: Error creating column with SQL:", error);
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Storage: Error creating column:", error);
      throw error;
    }
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

  // Chat operations
  async getChatChannel(id: number): Promise<ChatChannel | undefined> {
    const [channel] = await db.select().from(chatChannels).where(eq(chatChannels.id, id));
    return channel;
  }

  async getChatChannelWithMembers(id: number): Promise<ChatChannelWithMembers | undefined> {
    const channel = await this.getChatChannel(id);
    if (!channel) return undefined;

    const members = await this.getChatChannelMembers(id);
    return { ...channel, members };
  }

  async getChatChannels(): Promise<ChatChannel[]> {
    return await db.select().from(chatChannels).where(eq(chatChannels.isDirectMessage, false));
  }

  async getChatChannelsByUser(userId: number): Promise<ChatChannel[]> {
    const userMemberships = await db.select({
      channelId: chatChannelMembers.channelId
    }).from(chatChannelMembers).where(eq(chatChannelMembers.userId, userId));

    const channelIds = userMemberships.map(m => m.channelId);
    
    if (channelIds.length === 0) {
      return [];
    }

    return await db.select().from(chatChannels).where(
      sql`${chatChannels.id} IN (${channelIds.join(',')})`
    );
  }

  async getChatChannelByUsers(userIds: number[]): Promise<ChatChannel | undefined> {
    if (userIds.length !== 2) return undefined;
    
    // Check if a direct message channel already exists between these users
    const client = await pool.connect();
    
    try {
      // Find all DM channels for these users
      const result = await client.query(`
        WITH user_channels AS (
          SELECT channel_id 
          FROM chat_channel_members 
          WHERE user_id = ANY($1::int[])
          GROUP BY channel_id
          HAVING COUNT(DISTINCT user_id) = $2
        )
        SELECT c.* 
        FROM chat_channels c
        JOIN user_channels uc ON c.id = uc.channel_id
        WHERE c.is_direct_message = true
      `, [userIds, userIds.length]);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      return undefined;
    } finally {
      client.release();
    }
  }

  async createChatChannel(insertChannel: InsertChatChannel): Promise<ChatChannel> {
    const [channel] = await db
      .insert(chatChannels)
      .values(insertChannel)
      .returning();
    return channel;
  }

  async updateChatChannel(id: number, updates: Partial<InsertChatChannel>): Promise<ChatChannel | undefined> {
    const [channel] = await db
      .update(chatChannels)
      .set(updates)
      .where(eq(chatChannels.id, id))
      .returning();
    return channel;
  }

  async deleteChatChannel(id: number): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete all messages in the channel
      await client.query(`
        DELETE FROM chat_messages WHERE channel_id = $1
      `, [id]);
      
      // Delete all channel members
      await client.query(`
        DELETE FROM chat_channel_members WHERE channel_id = $1
      `, [id]);
      
      // Delete the channel
      await client.query(`
        DELETE FROM chat_channels WHERE id = $1
      `, [id]);
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting chat channel:', error);
      return false;
    } finally {
      client.release();
    }
  }
  
  // Chat channel members operations
  async addChatChannelMember(insertMember: InsertChatChannelMember): Promise<ChatChannelMember> {
    try {
      console.log("Adding channel member:", insertMember);
      
      // Check if member already exists to prevent duplicate insertion
      const existingMembers = await db
        .select()
        .from(chatChannelMembers)
        .where(
          and(
            eq(chatChannelMembers.channelId, insertMember.channelId),
            eq(chatChannelMembers.userId, insertMember.userId)
          )
        );
      
      console.log("Existing members check:", existingMembers);
      
      // If member already exists, return it
      if (existingMembers.length > 0) {
        console.log("Member already exists, returning existing member");
        return existingMembers[0];
      }
      
      // Otherwise insert the new member
      const [member] = await db
        .insert(chatChannelMembers)
        .values(insertMember)
        .returning();
      
      console.log("Added new member:", member);
      return member;
    } catch (error) {
      console.error("Error adding chat channel member:", error);
      throw error;
    }
  }

  async removeChatChannelMember(channelId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(chatChannelMembers)
      .where(
        and(
          eq(chatChannelMembers.channelId, channelId),
          eq(chatChannelMembers.userId, userId)
        )
      );
    return !!result;
  }

  async getChatChannelMembers(channelId: number): Promise<User[]> {
    const memberships = await db
      .select({
        userId: chatChannelMembers.userId
      })
      .from(chatChannelMembers)
      .where(eq(chatChannelMembers.channelId, channelId));
    
    const userIds = memberships.map(m => m.userId);
    
    if (userIds.length === 0) {
      return [];
    }
    
    return await db.select().from(users).where(
      sql`${users.id} IN (${userIds.join(',')})`
    );
  }
  
  // Chat messages operations
  async getChatMessages(channelId: number): Promise<ChatMessageWithSender[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.channelId, channelId))
      .orderBy(sql`${chatMessages.sentAt} ASC`);
    
    const senderIds = [...new Set(messages.map(m => m.senderId))];
    
    if (senderIds.length === 0) {
      return [];
    }
    
    const senders = await db.select().from(users).where(
      sql`${users.id} IN (${senderIds.join(',')})`
    );
    
    const senderMap = new Map(senders.map(s => [s.id, s]));
    
    return messages.map(message => ({
      ...message,
      sender: senderMap.get(message.senderId)!
    }));
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }
}

export const storage = new DatabaseStorage();