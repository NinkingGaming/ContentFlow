import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertProjectSchema, insertColumnSchema, 
  insertContentSchema, insertAttachmentSchema, insertYoutubeVideoSchema,
  insertProjectFileSchema, insertProjectFolderSchema, insertScriptDataSchema
} from "../shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";

// JWT for token-based auth
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session
  const MemStoreSession = MemoryStore(session);
  app.use(session({
    cookie: { maxAge: 86400000 },
    store: new MemStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: JWT_SECRET
  }));
  
  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) return done(null, false, { message: "Invalid username" });
      if (user.password !== password) return done(null, false, { message: "Invalid password" });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
  
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };
  
  // Auth endpoints
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const user = await storage.createUser(userData);
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error logging in after registration" });
        }
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/auth/me", isAuthenticated, (req, res) => {
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });
  
  // User endpoints
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...rest }) => rest);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Check if user has admin role
  const isAdmin = (req: Request, res: Response, next: Function) => {
    const user = req.user as any;
    if (user && user.role === 'admin') {
      return next();
    }
    res.status(403).json({ message: "Forbidden: Admin access required" });
  };
  
  // Update user role (admin only)
  app.patch("/api/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Don't allow admins to change their own role (prevent lockout)
      if (userId === currentUser.id) {
        return res.status(400).json({ message: "Cannot change your own role" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const schema = z.object({
        role: z.enum(['admin', 'producer', 'actor', 'employed'])
      });
      
      const { role } = schema.parse(req.body);
      
      // Update the user role
      const updatedUser = await storage.updateUser(userId, { role });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Delete user (admin only)
  app.delete("/api/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Don't allow admins to delete themselves
      if (userId === currentUser.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Special protection for the mastercontrol account
      if (currentUser.username !== 'mastercontrol') {
        return res.status(403).json({ message: "Only mastercontrol can delete user accounts" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const success = await storage.deleteUser(userId);
      if (success) {
        res.status(200).json({ message: "User deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete user" });
      }
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Add new user (admin only)
  app.post("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Project endpoints
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      console.log("Getting projects for user:", req.user);
      const user = req.user as any;
      const projects = await storage.getProjectsByUserId(user.id);
      console.log(`Retrieved ${projects.length} projects for user ${user.id}`);
      
      // Fetch members for each project
      const projectsWithMembers = await Promise.all(projects.map(async (project) => {
        try {
          const members = await storage.getProjectMembers(project.id);
          return { ...project, members };
        } catch (err) {
          console.error(`Error getting members for project ${project.id}:`, err);
          return { ...project, members: [] };
        }
      }));
      
      res.json(projectsWithMembers);
    } catch (error) {
      console.error("Error in /api/projects endpoint:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectWithMembers(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const projectData = insertProjectSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      const project = await storage.createProject(projectData);
      
      // Add members if provided
      if (req.body.memberIds && Array.isArray(req.body.memberIds)) {
        for (const memberId of req.body.memberIds) {
          await storage.addProjectMember({
            projectId: project.id,
            userId: memberId
          });
        }
      }
      
      // Create default columns
      const defaultColumns = [
        { name: "Ideation", color: "#EAB308", order: 0 },
        { name: "Pre-Production", color: "#3B82F6", order: 1 },
        { name: "Production", color: "#8B5CF6", order: 2 },
        { name: "Post-Production", color: "#10B981", order: 3 }
      ];
      
      for (const column of defaultColumns) {
        await storage.createColumn({
          ...column,
          projectId: project.id
        });
      }
      
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const user = req.user as any;
      if (project.createdBy !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updateSchema = insertProjectSchema.partial();
      const updates = updateSchema.parse(req.body);
      
      const updatedProject = await storage.updateProject(projectId, updates);
      res.json(updatedProject);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const user = req.user as any;
      // Allow admins or project creators to delete projects
      if (project.createdBy !== user.id && user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteProject(projectId);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Project members endpoints
  app.post("/api/projects/:id/members", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const user = req.user as any;
      if (project.createdBy !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const schema = z.object({
        userId: z.number()
      });
      
      const { userId } = schema.parse(req.body);
      
      // Check if user exists
      const memberToAdd = await storage.getUser(userId);
      if (!memberToAdd) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Add the member
      await storage.addProjectMember({
        projectId,
        userId
      });
      
      // Return updated members list
      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/projects/:projectId/members/:userId", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = parseInt(req.params.userId);
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const user = req.user as any;
      if (project.createdBy !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Don't allow removing the project creator
      if (project.createdBy === userId) {
        return res.status(400).json({ message: "Cannot remove project creator" });
      }
      
      await storage.removeProjectMember(projectId, userId);
      
      // Return updated members list
      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Column endpoints
  app.get("/api/projects/:id/columns", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const columns = await storage.getColumns(projectId);
      
      // Get contents for each column
      const columnsWithContents = await Promise.all(columns.map(async (column) => {
        return await storage.getColumnWithContents(column.id);
      }));
      
      res.json(columnsWithContents);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/columns", isAuthenticated, async (req, res) => {
    try {
      const columnData = insertColumnSchema.parse(req.body);
      
      // Verify project exists
      const project = await storage.getProject(columnData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify user has access to project
      const user = req.user as any;
      const members = await storage.getProjectMembers(columnData.projectId);
      if (!members.some(member => member.id === user.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const column = await storage.createColumn(columnData);
      res.status(201).json(column);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/columns/:id", isAuthenticated, async (req, res) => {
    try {
      const columnId = parseInt(req.params.id);
      const column = await storage.getColumns(columnId);
      
      if (!column) {
        return res.status(404).json({ message: "Column not found" });
      }
      
      const updateSchema = insertColumnSchema.partial();
      const updates = updateSchema.parse(req.body);
      
      const updatedColumn = await storage.updateColumn(columnId, updates);
      res.json(updatedColumn);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/columns/:id", isAuthenticated, async (req, res) => {
    try {
      const columnId = parseInt(req.params.id);
      const column = await storage.getColumns(columnId);
      
      if (!column) {
        return res.status(404).json({ message: "Column not found" });
      }
      
      await storage.deleteColumn(columnId);
      res.json({ message: "Column deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Content endpoints
  app.post("/api/contents", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating content with payload:", req.body);
      const user = req.user as any;
      const contentData = insertContentSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      console.log("Validated content data:", contentData);
      
      // Verify column exists
      const columns = await storage.getColumns(contentData.projectId);
      const column = columns.find(col => col.id === contentData.columnId);
      if (!column) {
        return res.status(404).json({ message: "Column not found" });
      }
      
      // Get current contents count to determine order
      const contents = await storage.getContentByColumn(contentData.columnId);
      
      // Create content with additional order field
      const content = await storage.createContent({
        ...contentData,
        order: contents.length  // Set the order directly in the database insert
      });
      
      console.log("Content created successfully:", content);
      res.status(201).json(content);
    } catch (error) {
      console.error("Error creating content:", error);
      if (error instanceof ZodError) {
        console.error("Validation error details:", error.errors);
        return res.status(400).json({ message: JSON.stringify(error.errors, null, 2) });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/contents/:id", isAuthenticated, async (req, res) => {
    try {
      const contentId = parseInt(req.params.id);
      const content = await storage.getContent(contentId);
      
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      const updateSchema = insertContentSchema.partial();
      const updates = updateSchema.parse(req.body);
      
      const updatedContent = await storage.updateContent(contentId, updates);
      res.json(updatedContent);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/contents/:id/move", isAuthenticated, async (req, res) => {
    try {
      const contentId = parseInt(req.params.id);
      const content = await storage.getContent(contentId);
      
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      const schema = z.object({
        columnId: z.number(),
        order: z.number()
      });
      
      const { columnId, order } = schema.parse(req.body);
      
      const updatedContent = await storage.moveContent(contentId, columnId, order);
      res.json(updatedContent);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/contents/:id", isAuthenticated, async (req, res) => {
    try {
      const contentId = parseInt(req.params.id);
      const content = await storage.getContent(contentId);
      
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      await storage.deleteContent(contentId);
      res.json({ message: "Content deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Attachment endpoints
  app.get("/api/contents/:id/attachments", isAuthenticated, async (req, res) => {
    try {
      const contentId = parseInt(req.params.id);
      const content = await storage.getContent(contentId);
      
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      const attachments = await storage.getAttachments(contentId);
      res.json(attachments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/attachments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const attachmentData = insertAttachmentSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      // Verify content exists
      const content = await storage.getContent(attachmentData.contentId);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      const attachment = await storage.createAttachment(attachmentData);
      res.status(201).json(attachment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/attachments/:id", isAuthenticated, async (req, res) => {
    try {
      const attachmentId = parseInt(req.params.id);
      await storage.deleteAttachment(attachmentId);
      res.json({ message: "Attachment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // YouTube Video endpoints
  app.get("/api/projects/:id/youtube-videos", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const videos = await storage.getYoutubeVideosByProject(projectId);
      res.json(videos);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/youtube-videos/:id", isAuthenticated, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getYoutubeVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: "YouTube video not found" });
      }
      
      res.json(video);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/youtube-videos", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const videoData = insertYoutubeVideoSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      // Verify project exists
      const project = await storage.getProject(videoData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const video = await storage.createYoutubeVideo(videoData);
      res.status(201).json(video);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/youtube-videos/:id", isAuthenticated, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getYoutubeVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: "YouTube video not found" });
      }
      
      const updateSchema = insertYoutubeVideoSchema.partial();
      const updates = updateSchema.parse(req.body);
      
      const updatedVideo = await storage.updateYoutubeVideo(videoId, updates);
      res.json(updatedVideo);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/youtube-videos/:id", isAuthenticated, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getYoutubeVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: "YouTube video not found" });
      }
      
      const user = req.user as any;
      const project = await storage.getProject(video.projectId);
      if (project && project.createdBy !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteYoutubeVideo(videoId);
      res.json({ message: "YouTube video deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Project Files endpoints
  app.get("/api/projects/:id/files", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const files = await storage.getProjectFilesByProject(projectId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/files/:id", isAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getProjectFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.json(file);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/folders/:id/files", isAuthenticated, async (req, res) => {
    try {
      const folderId = parseInt(req.params.id);
      const files = await storage.getProjectFilesByFolder(folderId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/files", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const fileData = insertProjectFileSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      const file = await storage.createProjectFile(fileData);
      res.status(201).json(file);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/files/:id", isAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getProjectFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const updateSchema = insertProjectFileSchema.partial();
      const updates = updateSchema.parse(req.body);
      
      const updatedFile = await storage.updateProjectFile(fileId, updates);
      res.json(updatedFile);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/files/:id", isAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getProjectFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      await storage.deleteProjectFile(fileId);
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Project Folders endpoints
  app.get("/api/projects/:id/folders", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const folders = await storage.getProjectFoldersByProject(projectId);
      res.json(folders);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/folders/:id", isAuthenticated, async (req, res) => {
    try {
      const folderId = parseInt(req.params.id);
      const folder = await storage.getProjectFolder(folderId);
      
      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }
      
      res.json(folder);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/projects/:projectId/folders/:folderId", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const folderId = req.params.folderId === 'root' ? null : parseInt(req.params.folderId);
      
      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const folderWithContents = await storage.getProjectFolderWithContents(folderId, projectId);
      res.json(folderWithContents);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/folders", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const folderData = insertProjectFolderSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      const folder = await storage.createProjectFolder(folderData);
      res.status(201).json(folder);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/folders/:id", isAuthenticated, async (req, res) => {
    try {
      const folderId = parseInt(req.params.id);
      const folder = await storage.getProjectFolder(folderId);
      
      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }
      
      const updateSchema = insertProjectFolderSchema.partial();
      const updates = updateSchema.parse(req.body);
      
      const updatedFolder = await storage.updateProjectFolder(folderId, updates);
      res.json(updatedFolder);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/folders/:id", isAuthenticated, async (req, res) => {
    try {
      const folderId = parseInt(req.params.id);
      const folder = await storage.getProjectFolder(folderId);
      
      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }
      
      await storage.deleteProjectFolder(folderId);
      res.json({ message: "Folder deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Script data endpoints
  app.get("/api/projects/:id/script-data", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Verify project exists and user has access
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get script data
      const scriptData = await storage.getScriptData(projectId);
      if (!scriptData) {
        return res.status(404).json({ message: "Script data not found" });
      }
      
      res.json(scriptData);
    } catch (error) {
      console.error("Error fetching script data:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/projects/:id/script-data", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = req.user as any;
      
      // Verify project exists and user has access
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if script data already exists
      const existingScriptData = await storage.getScriptData(projectId);
      if (existingScriptData) {
        return res.status(400).json({ message: "Script data already exists for this project" });
      }
      
      // Validate and create script data
      const scriptDataInput = insertScriptDataSchema.parse({
        ...req.body,
        projectId,
        createdBy: user.id
      });
      
      const newScriptData = await storage.createScriptData(scriptDataInput);
      res.status(201).json(newScriptData);
    } catch (error) {
      console.error("Error creating script data:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/projects/:id/script-data", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = req.user as any;
      
      // Verify project exists and user has access
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Validate update data
      const updateSchema = insertScriptDataSchema.partial();
      const updates = updateSchema.parse({
        ...req.body,
        createdBy: user.id // Use current user ID for updates if not exists
      });
      
      // Update script data
      const updatedScriptData = await storage.updateScriptData(projectId, updates);
      if (!updatedScriptData) {
        return res.status(404).json({ message: "Failed to update script data" });
      }
      
      res.json(updatedScriptData);
    } catch (error) {
      console.error("Error updating script data:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
