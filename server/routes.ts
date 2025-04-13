import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProjectSchema, insertColumnSchema, insertContentSchema, insertAttachmentSchema } from "../shared/schema";
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
  
  // Project endpoints
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const projects = await storage.getProjectsByUserId(user.id);
      
      // Fetch members for each project
      const projectsWithMembers = await Promise.all(projects.map(async (project) => {
        const members = await storage.getProjectMembers(project.id);
        return { ...project, members };
      }));
      
      res.json(projectsWithMembers);
    } catch (error) {
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
      if (project.createdBy !== user.id) {
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
      const user = req.user as any;
      const contentData = insertContentSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      // Verify column exists
      const columns = await storage.getColumns(contentData.projectId);
      const column = columns.find(col => col.id === contentData.columnId);
      if (!column) {
        return res.status(404).json({ message: "Column not found" });
      }
      
      // Get current contents count to determine order
      const contents = await storage.getContentByColumn(contentData.columnId);
      contentData.order = contents.length;
      
      const content = await storage.createContent(contentData);
      res.status(201).json(content);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
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

  const httpServer = createServer(app);
  return httpServer;
}
