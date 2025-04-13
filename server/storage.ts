import { 
  users, User, InsertUser, 
  projects, Project, InsertProject,
  projectMembers, ProjectMember, InsertProjectMember,
  columns, Column, InsertColumn,
  contents, Content, InsertContent,
  attachments, Attachment, InsertAttachment,
  ProjectWithMembers, ColumnWithContents, ContentWithAssignee
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private projectMembers: Map<string, ProjectMember>;
  private columns: Map<number, Column>;
  private contents: Map<number, Content>;
  private attachments: Map<number, Attachment>;
  
  private currentUserId: number;
  private currentProjectId: number;
  private currentColumnId: number;
  private currentContentId: number;
  private currentAttachmentId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.projectMembers = new Map();
    this.columns = new Map();
    this.contents = new Map();
    this.attachments = new Map();
    
    this.currentUserId = 1;
    this.currentProjectId = 1;
    this.currentColumnId = 1;
    this.currentContentId = 1;
    this.currentAttachmentId = 1;
    
    // Create demo data
    this.initDemoData();
  }

  private initDemoData() {
    // Create demo users
    const user1 = this.createUser({
      username: "johndoe",
      password: "password123",
      displayName: "John Doe",
      email: "john@example.com",
      avatarInitials: "JD",
      avatarColor: "#3B82F6"
    });
    
    const user2 = this.createUser({
      username: "alexkim",
      password: "password123",
      displayName: "Alex Kim",
      email: "alex@example.com",
      avatarInitials: "AK",
      avatarColor: "#8B5CF6"
    });
    
    const user3 = this.createUser({
      username: "taylor",
      password: "password123",
      displayName: "Taylor Moore",
      email: "taylor@example.com",
      avatarInitials: "TM",
      avatarColor: "#10B981"
    });

    // Create demo project
    const project = this.createProject({
      name: "Summer Campaign",
      description: "YouTube video series planning",
      type: "YouTube Series",
      createdBy: user1.id
    });

    // Add project members
    this.addProjectMember({ projectId: project.id, userId: user1.id });
    this.addProjectMember({ projectId: project.id, userId: user2.id });
    this.addProjectMember({ projectId: project.id, userId: user3.id });

    // Create columns
    const ideation = this.createColumn({
      projectId: project.id,
      name: "Ideation",
      color: "#EAB308", // yellow-500
      order: 0
    });

    const preProduction = this.createColumn({
      projectId: project.id,
      name: "Pre-Production",
      color: "#3B82F6", // blue-500
      order: 1
    });

    const production = this.createColumn({
      projectId: project.id,
      name: "Production",
      color: "#8B5CF6", // purple-500
      order: 2
    });

    const postProduction = this.createColumn({
      projectId: project.id,
      name: "Post-Production",
      color: "#10B981", // green-500
      order: 3
    });

    // Create content in ideation
    this.createContent({
      title: "Top 10 Summer Travel Hacks",
      description: "Quick tips for budget-friendly summer travel experiences",
      type: "Idea",
      columnId: ideation.id,
      projectId: project.id,
      assignedTo: user1.id,
      dueDate: new Date("2023-06-10"),
      priority: "Medium",
      order: 0,
      createdBy: user1.id
    });
    
    this.createContent({
      title: "Summer Lookbook 2023",
      description: "Fashion trends and outfit ideas for summer season",
      type: "Idea",
      columnId: ideation.id,
      projectId: project.id,
      assignedTo: user3.id,
      dueDate: new Date("2023-06-08"),
      priority: "Medium",
      order: 1,
      createdBy: user3.id
    });
    
    this.createContent({
      title: "DIY Backyard Makeover",
      description: "Budget-friendly ideas to transform your outdoor space",
      type: "Idea",
      columnId: ideation.id,
      projectId: project.id,
      assignedTo: user2.id,
      dueDate: new Date("2023-06-05"),
      priority: "Medium",
      order: 2,
      createdBy: user2.id
    });

    // Create content in pre-production
    const beachEssentials = this.createContent({
      title: "Beach Essentials Guide",
      description: "Must-have items for the perfect beach day",
      type: "Script",
      columnId: preProduction.id,
      projectId: project.id,
      assignedTo: user1.id,
      dueDate: new Date("2023-06-12"),
      priority: "Medium",
      progress: 75,
      order: 0,
      createdBy: user1.id
    });
    
    const summerCocktails = this.createContent({
      title: "Summer Cocktails Tutorial",
      description: "Easy recipes for refreshing summer drinks",
      type: "Storyboard",
      columnId: preProduction.id,
      projectId: project.id,
      assignedTo: user3.id,
      dueDate: new Date("2023-06-15"),
      priority: "Medium",
      progress: 40,
      order: 1,
      createdBy: user3.id
    });

    // Create content in production
    this.createContent({
      title: "Summer Outdoor Activities",
      description: "Fun activities to enjoy during summer",
      type: "Shooting",
      columnId: production.id,
      projectId: project.id,
      assignedTo: user2.id,
      dueDate: new Date("2023-06-20"),
      priority: "High",
      order: 0,
      createdBy: user2.id
    });

    // Add attachments
    this.createAttachment({
      contentId: beachEssentials.id,
      name: "beach_script_v1.txt",
      url: "/attachments/beach_script_v1.txt",
      createdBy: user1.id
    });
    
    this.createAttachment({
      contentId: beachEssentials.id,
      name: "beach_props_list.txt",
      url: "/attachments/beach_props_list.txt",
      createdBy: user1.id
    });
    
    this.createAttachment({
      contentId: beachEssentials.id,
      name: "location_ideas.txt",
      url: "/attachments/location_ideas.txt",
      createdBy: user1.id
    });
    
    this.createAttachment({
      contentId: summerCocktails.id,
      name: "cocktail_recipes.txt",
      url: "/attachments/cocktail_recipes.txt",
      createdBy: user3.id
    });
    
    this.createAttachment({
      contentId: summerCocktails.id,
      name: "storyboard_draft.txt",
      url: "/attachments/storyboard_draft.txt",
      createdBy: user3.id
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectWithMembers(id: number): Promise<ProjectWithMembers | undefined> {
    const project = await this.getProject(id);
    if (!project) return undefined;
    
    const members = await this.getProjectMembers(id);
    return { ...project, members };
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    const memberEntries = Array.from(this.projectMembers.values()).filter(
      (pm) => pm.userId === userId
    );
    
    const projects: Project[] = [];
    for (const entry of memberEntries) {
      const project = await this.getProject(entry.projectId);
      if (project) projects.push(project);
    }
    
    return projects;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const now = new Date();
    const project: Project = { ...insertProject, id, createdAt: now };
    this.projects.set(id, project);
    
    // Add creator as a project member
    await this.addProjectMember({
      projectId: id,
      userId: insertProject.createdBy
    });
    
    return project;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const existingProject = await this.getProject(id);
    if (!existingProject) return undefined;
    
    const updatedProject = { ...existingProject, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    // Delete all project members
    const memberEntries = Array.from(this.projectMembers.values()).filter(
      (pm) => pm.projectId === id
    );
    
    for (const entry of memberEntries) {
      await this.removeProjectMember(id, entry.userId);
    }
    
    // Delete all columns and their contents
    const columns = await this.getColumns(id);
    for (const column of columns) {
      await this.deleteColumn(column.id);
    }
    
    return this.projects.delete(id);
  }

  // Project members operations
  async addProjectMember(insertProjectMember: InsertProjectMember): Promise<ProjectMember> {
    const key = `${insertProjectMember.projectId}-${insertProjectMember.userId}`;
    this.projectMembers.set(key, insertProjectMember);
    return insertProjectMember;
  }

  async removeProjectMember(projectId: number, userId: number): Promise<boolean> {
    const key = `${projectId}-${userId}`;
    return this.projectMembers.delete(key);
  }

  async getProjectMembers(projectId: number): Promise<User[]> {
    const memberEntries = Array.from(this.projectMembers.values()).filter(
      (pm) => pm.projectId === projectId
    );
    
    const members: User[] = [];
    for (const entry of memberEntries) {
      const user = await this.getUser(entry.userId);
      if (user) members.push(user);
    }
    
    return members;
  }

  // Column operations
  async getColumns(projectId: number): Promise<Column[]> {
    return Array.from(this.columns.values())
      .filter((column) => column.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }

  async getColumnWithContents(columnId: number): Promise<ColumnWithContents | undefined> {
    const column = this.columns.get(columnId);
    if (!column) return undefined;
    
    const contents = await this.getContentByColumn(columnId);
    const contentsWithAssignee: ContentWithAssignee[] = [];
    
    for (const content of contents) {
      const contentWithAssignee = { ...content } as ContentWithAssignee;
      
      if (content.assignedTo) {
        const assignee = await this.getUser(content.assignedTo);
        if (assignee) contentWithAssignee.assignee = assignee;
      }
      
      const attachments = await this.getAttachments(content.id);
      contentWithAssignee.attachmentCount = attachments.length;
      
      contentsWithAssignee.push(contentWithAssignee);
    }
    
    return { ...column, contents: contentsWithAssignee };
  }

  async createColumn(insertColumn: InsertColumn): Promise<Column> {
    const id = this.currentColumnId++;
    const column: Column = { ...insertColumn, id };
    this.columns.set(id, column);
    return column;
  }

  async updateColumn(id: number, updates: Partial<InsertColumn>): Promise<Column | undefined> {
    const existingColumn = this.columns.get(id);
    if (!existingColumn) return undefined;
    
    const updatedColumn = { ...existingColumn, ...updates };
    this.columns.set(id, updatedColumn);
    return updatedColumn;
  }

  async deleteColumn(id: number): Promise<boolean> {
    // Delete all contents in this column
    const contents = await this.getContentByColumn(id);
    for (const content of contents) {
      await this.deleteContent(content.id);
    }
    
    return this.columns.delete(id);
  }

  // Content operations
  async getContent(id: number): Promise<Content | undefined> {
    return this.contents.get(id);
  }

  async getContentByProject(projectId: number): Promise<Content[]> {
    return Array.from(this.contents.values())
      .filter((content) => content.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }

  async getContentByColumn(columnId: number): Promise<Content[]> {
    return Array.from(this.contents.values())
      .filter((content) => content.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  }

  async getContentWithAssignee(id: number): Promise<ContentWithAssignee | undefined> {
    const content = await this.getContent(id);
    if (!content) return undefined;
    
    const contentWithAssignee: ContentWithAssignee = { ...content };
    
    if (content.assignedTo) {
      const assignee = await this.getUser(content.assignedTo);
      if (assignee) contentWithAssignee.assignee = assignee;
    }
    
    const attachments = await this.getAttachments(content.id);
    contentWithAssignee.attachmentCount = attachments.length;
    
    return contentWithAssignee;
  }

  async createContent(insertContent: InsertContent): Promise<Content> {
    const id = this.currentContentId++;
    const now = new Date();
    const content: Content = { ...insertContent, id, createdAt: now };
    this.contents.set(id, content);
    return content;
  }

  async updateContent(id: number, updates: Partial<InsertContent>): Promise<Content | undefined> {
    const existingContent = this.contents.get(id);
    if (!existingContent) return undefined;
    
    const updatedContent = { ...existingContent, ...updates };
    this.contents.set(id, updatedContent);
    return updatedContent;
  }

  async moveContent(id: number, newColumnId: number, newOrder: number): Promise<Content | undefined> {
    const content = await this.getContent(id);
    if (!content) return undefined;
    
    // Reorder contents in the old column
    const oldColumnContents = await this.getContentByColumn(content.columnId);
    for (const c of oldColumnContents) {
      if (c.id !== id && c.order > content.order) {
        await this.updateContent(c.id, { order: c.order - 1 });
      }
    }
    
    // Reorder contents in the new column
    const newColumnContents = await this.getContentByColumn(newColumnId);
    for (const c of newColumnContents) {
      if (c.order >= newOrder) {
        await this.updateContent(c.id, { order: c.order + 1 });
      }
    }
    
    // Update the content's column and order
    return this.updateContent(id, { columnId: newColumnId, order: newOrder });
  }

  async deleteContent(id: number): Promise<boolean> {
    // Delete all attachments for this content
    const attachments = await this.getAttachments(id);
    for (const attachment of attachments) {
      await this.deleteAttachment(attachment.id);
    }
    
    return this.contents.delete(id);
  }

  // Attachment operations
  async getAttachments(contentId: number): Promise<Attachment[]> {
    return Array.from(this.attachments.values())
      .filter((attachment) => attachment.contentId === contentId);
  }

  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const id = this.currentAttachmentId++;
    const now = new Date();
    const attachment: Attachment = { ...insertAttachment, id, createdAt: now };
    this.attachments.set(id, attachment);
    return attachment;
  }

  async deleteAttachment(id: number): Promise<boolean> {
    return this.attachments.delete(id);
  }
}

export const storage = new MemStorage();
