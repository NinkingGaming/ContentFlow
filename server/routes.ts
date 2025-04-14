import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { pool } from "./db";
import { 
  insertUserSchema, insertProjectSchema, insertColumnSchema, 
  insertContentSchema, insertAttachmentSchema, insertYoutubeVideoSchema,
  insertProjectFileSchema, insertProjectFolderSchema, insertScriptDataSchema,
  insertChatChannelSchema, insertChatChannelMemberSchema, insertChatMessageSchema,
  UserRole
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
      console.log(`Getting project with members for ID: ${projectId}`);
      
      // First try to get the base project
      const baseProject = await storage.getProject(projectId);
      if (!baseProject) {
        console.log(`Project with ID ${projectId} not found`);
        return res.status(404).json({ message: "Project not found" });
      }
      
      console.log(`Found base project: ${JSON.stringify(baseProject)}`);
      
      try {
        // Then try to get the members
        const members = await storage.getProjectMembers(projectId);
        console.log(`Found ${members.length} members for project ${projectId}`);
        
        // Combine the project with its members
        const projectWithMembers = { ...baseProject, members };
        res.json(projectWithMembers);
      } catch (membersError) {
        console.error(`Error getting members for project ${projectId}:`, membersError);
        // Return the project without members if there's an error getting members
        res.json({ ...baseProject, members: [] });
      }
    } catch (error) {
      console.error(`Error in /api/projects/:id endpoint for ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating project with payload:", req.body);
      const user = req.user as any;
      
      const projectData = insertProjectSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      console.log("Validated project data:", projectData);
      
      // Get database client for transaction
      const client = await pool.connect();
      
      try {
        // Start transaction
        await client.query('BEGIN');
        
        // Create project directly with SQL
        const projectResult = await client.query(
          `INSERT INTO projects (name, description, type, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, name, description, type, created_by AS "createdBy", created_at AS "createdAt"`,
          [projectData.name, projectData.description, projectData.type, user.id, new Date()]
        );
        
        const project = projectResult.rows[0];
        console.log("Project created successfully:", project);
        
        // Add admin users to project
        const adminUsersResult = await client.query(
          `SELECT id, username, display_name, email, avatar_initials, avatar_color, role
           FROM users 
           WHERE role = 'admin'`
        );
        
        console.log(`Found ${adminUsersResult.rowCount} admin users to add to project ${project.id}`);
        
        for (const admin of adminUsersResult.rows) {
          await client.query(
            `INSERT INTO project_members (project_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [project.id, admin.id]
          );
        }
        
        // Add members if provided
        if (req.body.memberIds && Array.isArray(req.body.memberIds)) {
          for (const memberId of req.body.memberIds) {
            await client.query(
              `INSERT INTO project_members (project_id, user_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [project.id, memberId]
            );
          }
        }
        
        // Create default columns directly with SQL
        console.log("Creating default columns for project:", project.id);
        
        // Pitches column - Orange (2 columns wide)
        console.log("Creating Pitches column with explicit color value: '#F97316'");
        await client.query(
          `INSERT INTO columns (project_id, name, color, "order", width)
           VALUES ($1, $2, $3, $4, $5)`,
          [project.id, "Pitches", "#F97316", 0, 2]
        );
        
        // Consideration column - Blue 
        console.log("Creating Consideration column with explicit color value: '#3B82F6'");
        await client.query(
          `INSERT INTO columns (project_id, name, color, "order", width)
           VALUES ($1, $2, $3, $4, $5)`,
          [project.id, "Consideration", "#3B82F6", 1, 1]
        );
        
        // Accepted column - Green
        console.log("Creating Accepted column with explicit color value: '#10B981'");
        await client.query(
          `INSERT INTO columns (project_id, name, color, "order", width)
           VALUES ($1, $2, $3, $4, $5)`,
          [project.id, "Accepted", "#10B981", 2, 1]
        );
        
        console.log("All default columns created successfully");
        
        // Commit the transaction
        await client.query('COMMIT');
        
        res.status(201).json(project);
        return; // Early return to avoid the second response
      } catch (error) {
        await client.query('ROLLBACK');
        console.error("Transaction error in project creation:", error);
        console.error("Transaction error stack:", error instanceof Error ? error.stack : "No stack trace");
        // Instead of just throwing the error, provide detailed information back to the client
        return res.status(500).json({ 
          message: "Database error creating project", 
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        client.release();
      }
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
      console.log("Creating content with payload:", JSON.stringify(req.body));
      const user = req.user as any;
      
      if (!user || !user.id) {
        console.error("Unauthorized: user is missing or invalid", user);
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      try {
        // Validate the input data with ZodError handling
        const contentData = insertContentSchema.parse({
          ...req.body,
          createdBy: user.id
        });
        
        console.log("Validated content data:", JSON.stringify(contentData));
        
        // Verify the project exists
        const project = await storage.getProject(contentData.projectId);
        if (!project) {
          console.error(`Project not found: ${contentData.projectId}`);
          return res.status(404).json({ message: "Project not found" });
        }
        
        // Verify column exists and belongs to the project
        const columns = await storage.getColumns(contentData.projectId);
        const column = columns.find(col => col.id === contentData.columnId);
        if (!column) {
          console.error(`Column not found: ${contentData.columnId} in project ${contentData.projectId}`);
          return res.status(404).json({ message: "Column not found" });
        }
        
        // Get current contents count to determine order
        const contents = await storage.getContentByColumn(contentData.columnId);
        const orderValue = contents.length;
        
        // Use direct SQL to ensure proper handling of all fields
        const client = await pool.connect();
        try {
          // Start transaction
          await client.query('BEGIN');
          
          // Insert content with direct SQL
          console.log(`Creating content with SQL: title=${contentData.title}, columnId=${contentData.columnId}, order=${orderValue}`);
          
          const contentResult = await client.query(
            `INSERT INTO contents (
              title, description, type, project_id, column_id, 
              created_by, assigned_to, priority, progress, "order", 
              due_date, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING 
              id, title, description, type, project_id AS "projectId", 
              column_id AS "columnId", created_by AS "createdBy", 
              assigned_to AS "assignedTo", priority, progress, "order", 
              due_date AS "dueDate", created_at AS "createdAt"`,
            [
              contentData.title,
              contentData.description || null,
              contentData.type || 'task',
              contentData.projectId,
              contentData.columnId,
              contentData.createdBy,
              contentData.assignedTo || null,
              contentData.priority || null,
              contentData.progress || 0,
              orderValue,
              contentData.dueDate || null,
              new Date()
            ]
          );
          
          // Commit transaction
          await client.query('COMMIT');
          
          const content = contentResult.rows[0];
          console.log("Content created successfully:", JSON.stringify(content));
          return res.status(201).json(content);
        } catch (dbError) {
          await client.query('ROLLBACK');
          console.error("Transaction error in content creation:", dbError);
          console.error("Transaction error stack:", dbError instanceof Error ? dbError.stack : "No stack trace");
          return res.status(500).json({ 
            message: "Database error creating content", 
            error: dbError instanceof Error ? dbError.message : String(dbError)
          });
        } finally {
          client.release();
        }
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          console.error("Validation error details:", validationError.errors);
          return res.status(400).json({ 
            message: "Invalid content data", 
            error: fromZodError(validationError).message
          });
        }
        throw validationError;
      }
    } catch (error) {
      console.error("Error creating content:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
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

  // ========== Published Finals API ==========
  
  // Get all published finals for a project
  app.get("/api/projects/:id/published-finals", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Verify project exists and user has access
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get published finals
      const finals = await storage.getPublishedFinals(projectId);
      
      // For each final, get the user who published it
      const finalsWithUser = await Promise.all(finals.map(async (final) => {
        const user = await storage.getUser(final.publishedBy);
        return {
          ...final,
          publisher: user ? {
            id: user.id,
            displayName: user.displayName,
            avatarInitials: user.avatarInitials,
            avatarColor: user.avatarColor
          } : null
        };
      }));
      
      res.json(finalsWithUser);
    } catch (error) {
      console.error("Error fetching published finals:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get a specific published final
  app.get("/api/published-finals/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get published final
      const final = await storage.getPublishedFinal(id);
      if (!final) {
        return res.status(404).json({ message: "Published final not found" });
      }
      
      // Verify project exists and user has access
      const project = await storage.getProject(final.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get the user who published it
      const user = await storage.getUser(final.publishedBy);
      
      res.json({
        ...final,
        publisher: user ? {
          id: user.id,
          displayName: user.displayName,
          avatarInitials: user.avatarInitials,
          avatarColor: user.avatarColor
        } : null
      });
    } catch (error) {
      console.error("Error fetching published final:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Create a new published final
  app.post("/api/projects/:id/published-finals", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = req.user as any;
      
      // Verify project exists and user has access
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get current script data
      const scriptData = await storage.getScriptData(projectId);
      if (!scriptData || !scriptData.finalContent) {
        return res.status(400).json({ message: "No final content available to publish" });
      }
      
      // Get the latest version number for this project
      const existingFinals = await storage.getPublishedFinals(projectId);
      const currentVersion = existingFinals.length > 0 
        ? Math.max(...existingFinals.map(f => f.version)) 
        : 0;
      
      // Create new published final
      const newFinal = await storage.createPublishedFinal({
        projectId,
        title: req.body.title || `Version ${currentVersion + 1}`,
        content: scriptData.finalContent,
        version: currentVersion + 1,
        publishedBy: user.id
      });
      
      // Get the user who published it
      const publisher = await storage.getUser(user.id);
      
      res.status(201).json({
        ...newFinal,
        publisher: publisher ? {
          id: publisher.id,
          displayName: publisher.displayName,
          avatarInitials: publisher.avatarInitials,
          avatarColor: publisher.avatarColor
        } : null
      });
    } catch (error) {
      console.error("Error creating published final:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // ========== Schedule Events API ==========
  
  // Get all schedule events for a project
  app.get("/api/projects/:id/schedule", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const events = await storage.getScheduleEventsByProject(projectId);
      res.json(events);
    } catch (error) {
      console.error("Error getting schedule events:", error);
      res.status(500).json({ message: "Failed to get schedule events" });
    }
  });
  
  // Get schedule events for a specific month with 2-week padding
  app.get("/api/projects/:id/schedule/month/:year/:month", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      const events = await storage.getScheduleEventsByMonth(projectId, year, month);
      res.json(events);
    } catch (error) {
      console.error("Error getting schedule events for month:", error);
      res.status(500).json({ message: "Failed to get schedule events for month" });
    }
  });
  
  // Create a new schedule event
  app.post("/api/projects/:id/schedule", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = req.user as any;
      
      const eventData = {
        ...req.body,
        projectId,
        createdBy: user.id,
      };
      
      const newEvent = await storage.createScheduleEvent(eventData);
      res.status(201).json(newEvent);
    } catch (error) {
      console.error("Error creating schedule event:", error);
      res.status(500).json({ message: "Failed to create schedule event" });
    }
  });
  
  // Update a schedule event
  app.put("/api/projects/:id/schedule/:eventId", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      
      const updatedEvent = await storage.updateScheduleEvent(eventId, req.body);
      if (!updatedEvent) {
        return res.status(404).json({ message: "Schedule event not found" });
      }
      
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating schedule event:", error);
      res.status(500).json({ message: "Failed to update schedule event" });
    }
  });
  
  // Delete a schedule event
  app.delete("/api/projects/:id/schedule/:eventId", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      
      const success = await storage.deleteScheduleEvent(eventId);
      if (!success) {
        return res.status(404).json({ message: "Schedule event not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting schedule event:", error);
      res.status(500).json({ message: "Failed to delete schedule event" });
    }
  });

  // ========== Chat Channel API ==========
  
  // Get all chat channels for current user
  app.get("/api/chat/channels", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      console.log("Fetching chat channels for user ID:", user.id);
      const channels = await storage.getChatChannelsByUser(user.id);
      console.log("Retrieved channels:", channels);
      
      // Get members for each channel
      const channelsWithMembers = await Promise.all(channels.map(async (channel) => {
        console.log("Getting members for channel ID:", channel.id);
        const members = await storage.getChatChannelMembers(channel.id);
        console.log("Retrieved members:", members);
        return { ...channel, members };
      }));
      
      res.json(channelsWithMembers);
    } catch (error) {
      console.error("Error getting chat channels:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get all global channels (non-DM channels)
  app.get("/api/chat/channels/global", isAuthenticated, async (req, res) => {
    try {
      const channels = await storage.getChatChannels();
      
      // Get members for each channel
      const channelsWithMembers = await Promise.all(channels.map(async (channel) => {
        const members = await storage.getChatChannelMembers(channel.id);
        return { ...channel, members };
      }));
      
      res.json(channelsWithMembers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get a specific channel
  app.get("/api/chat/channels/:id", isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const channel = await storage.getChatChannelWithMembers(channelId);
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      res.json(channel);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Create a new channel (admin or producer only)
  app.post("/api/chat/channels", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Only admins can create normal channels
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.PRODUCER) {
        return res.status(403).json({ message: "Forbidden: Only admins and producers can create channels" });
      }
      
      const channelData = insertChatChannelSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      const channel = await storage.createChatChannel(channelData);
      
      // Add creator as a member and admin of the channel
      await storage.addChatChannelMember({
        channelId: channel.id,
        userId: user.id,
        isAdmin: true
      });
      
      // Add any additional members if specified
      if (req.body.memberIds && Array.isArray(req.body.memberIds)) {
        for (const memberId of req.body.memberIds) {
          await storage.addChatChannelMember({
            channelId: channel.id,
            userId: memberId,
            isAdmin: false
          });
        }
      }
      
      // Get the channel with its members
      const channelWithMembers = await storage.getChatChannelWithMembers(channel.id);
      
      res.status(201).json(channelWithMembers);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get or create a DM channel between two users
  app.post("/api/chat/channels/dm", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      console.log("Creating DM channel for user:", user);
      
      const schema = z.object({
        otherUserId: z.number()
      });
      
      const { otherUserId } = schema.parse(req.body);
      console.log("Other user ID:", otherUserId);
      
      // Validate that user is not trying to DM themselves
      if (user.id === otherUserId) {
        return res.status(400).json({ message: "Cannot create a DM channel with yourself" });
      }
      
      // Check if otherUser exists
      const otherUser = await storage.getUser(otherUserId);
      console.log("Other user:", otherUser);
      if (!otherUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      try {
        // Check if a DM channel already exists
        console.log("Checking for existing DM channel between user IDs:", [user.id, otherUserId]);
        const existingChannel = await storage.getChatChannelByUsers([user.id, otherUserId]);
        console.log("Existing channel:", existingChannel);
        
        if (existingChannel) {
          console.log("Found existing channel, getting members");
          const channelWithMembers = await storage.getChatChannelWithMembers(existingChannel.id);
          return res.json(channelWithMembers);
        }
        
        const client = await pool.connect();
        
        try {
          await client.query('BEGIN');
          
          // Create a new DM channel
          const channelName = `DM: ${user.displayName} & ${otherUser.displayName}`;
          console.log("Creating new DM channel with name:", channelName);
          
          // Insert the channel with a raw query to ensure proper handling
          const channelResult = await client.query(`
            INSERT INTO chat_channels (name, description, is_private, is_direct_message, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING *
          `, [channelName, "Direct Messages", true, true, user.id]);
          
          const channel = channelResult.rows[0];
          console.log("Created channel:", channel);
          
          // Add both users to the channel
          console.log("Adding user to channel:", user.id);
          await client.query(`
            INSERT INTO chat_channel_members (channel_id, user_id, is_admin, joined_at)
            VALUES ($1, $2, $3, NOW())
          `, [channel.id, user.id, true]);
          
          console.log("Adding other user to channel:", otherUserId);
          await client.query(`
            INSERT INTO chat_channel_members (channel_id, user_id, is_admin, joined_at)
            VALUES ($1, $2, $3, NOW())
          `, [channel.id, otherUserId, false]);
          
          await client.query('COMMIT');
          
          // Get the channel with its members
          console.log("Getting channel with members");
          const channelWithMembers = await storage.getChatChannelWithMembers(channel.id);
          console.log("Channel with members:", channelWithMembers);
          
          res.status(201).json(channelWithMembers);
        } catch (dbError) {
          await client.query('ROLLBACK');
          console.error("Database error creating DM channel:", dbError);
          throw dbError;
        } finally {
          client.release();
        }
      } catch (channelError) {
        console.error("Error in channel operations:", channelError);
        throw new Error(`Channel operation failed: ${channelError.message}`);
      }
    } catch (error) {
      console.error("Error creating DM channel:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ 
        message: "Server error creating direct message channel",
        details: error.message
      });
    }
  });
  
  // Update a channel (admin or creator only)
  app.put("/api/chat/channels/:id", isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const channel = await storage.getChatChannel(channelId);
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      const user = req.user as any;
      
      // Check if user is an admin of the channel or the creator
      const members = await storage.getChatChannelMembers(channelId);
      const userMembership = members.find(m => m.id === user.id);
      
      if (channel.createdBy !== user.id && user.role !== UserRole.ADMIN && !userMembership?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to update this channel" });
      }
      
      const updateSchema = insertChatChannelSchema.partial();
      const updates = updateSchema.parse(req.body);
      
      const updatedChannel = await storage.updateChatChannel(channelId, updates);
      res.json(updatedChannel);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Delete a channel (admin or creator only)
  app.delete("/api/chat/channels/:id", isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const channel = await storage.getChatChannel(channelId);
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      const user = req.user as any;
      
      // Only allow admins or channel creators to delete
      if (channel.createdBy !== user.id && user.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to delete this channel" });
      }
      
      await storage.deleteChatChannel(channelId);
      res.json({ message: "Channel deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Channel members endpoints
  app.post("/api/chat/channels/:id/members", isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const channel = await storage.getChatChannel(channelId);
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      const user = req.user as any;
      
      // Only allow admins or channel creators to add members
      if (channel.createdBy !== user.id && user.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to add members" });
      }
      
      const schema = z.object({
        userId: z.number(),
        isAdmin: z.boolean().optional()
      });
      
      const { userId, isAdmin } = schema.parse(req.body);
      
      // Check if user exists
      const userToAdd = await storage.getUser(userId);
      if (!userToAdd) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Add member to channel
      await storage.addChatChannelMember({
        channelId,
        userId,
        isAdmin: isAdmin || false
      });
      
      // Get updated member list
      const members = await storage.getChatChannelMembers(channelId);
      
      res.status(201).json(members);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Remove a member from a channel
  app.delete("/api/chat/channels/:channelId/members/:userId", isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const memberIdToRemove = parseInt(req.params.userId);
      
      const channel = await storage.getChatChannel(channelId);
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      const user = req.user as any;
      
      // Direct message channels shouldn't allow member removal
      if (channel.isDirectMessage) {
        return res.status(403).json({ message: "Cannot remove members from direct message channels" });
      }
      
      // Only allow admins, channel creators, or the member themselves to remove
      if (channel.createdBy !== user.id && user.role !== UserRole.ADMIN && user.id !== memberIdToRemove) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to remove members" });
      }
      
      await storage.removeChatChannelMember(channelId, memberIdToRemove);
      
      // Get updated member list
      const members = await storage.getChatChannelMembers(channelId);
      
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get messages from a channel
  app.get("/api/chat/channels/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const channel = await storage.getChatChannel(channelId);
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      const user = req.user as any;
      
      // Check if user is a member of the channel
      const members = await storage.getChatChannelMembers(channelId);
      const isMember = members.some(m => m.id === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: "Forbidden: You are not a member of this channel" });
      }
      
      const messages = await storage.getChatMessages(channelId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server (for real-time chat)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients by user ID
  const clients = new Map();
  
  wss.on('connection', (socket) => {
    console.log('WebSocket client connected');
    let userId = null;
    
    socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Handle authentication message
        if (data.type === 'auth') {
          userId = data.userId;
          // Store this connection with the userId
          clients.set(userId, socket);
          console.log(`User ${userId} authenticated on WebSocket`);
          
          // Send a confirmation back to the client
          socket.send(JSON.stringify({
            type: 'auth_success',
            userId: userId
          }));
        }
        
        // Handle join channel message
        else if (data.type === 'join_channel') {
          // Validate that the user is authenticated
          if (!userId) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Not authenticated'
            }));
            return;
          }
          
          const channelId = data.channelId;
          
          // Check if channel exists
          const channel = await storage.getChatChannel(channelId);
          if (!channel) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Channel not found'
            }));
            return;
          }
          
          // Check if user is a member of the channel
          const members = await storage.getChatChannelMembers(channelId);
          const isMember = members.some(m => m.id === userId);
          
          if (!isMember) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'You are not a member of this channel'
            }));
            return;
          }
          
          // Store the channel with the user
          socket.channelId = channelId;
          
          // Send confirmation
          socket.send(JSON.stringify({
            type: 'channel_joined',
            channelId: channelId
          }));
          
          // Send previous messages
          const messages = await storage.getChatMessages(channelId);
          socket.send(JSON.stringify({
            type: 'message_history',
            channelId: channelId,
            messages: messages
          }));
        }
        
        // Handle chat messages
        else if (data.type === 'chat_message') {
          // Validate that the user is authenticated
          if (!userId) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Not authenticated'
            }));
            return;
          }
          
          // Ensure we have a channel
          const channelId = data.channelId || socket.channelId;
          if (!channelId) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'No channel selected'
            }));
            return;
          }
          
          // Get the channel and check if user is a member
          const channel = await storage.getChatChannel(channelId);
          if (!channel) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Channel not found'
            }));
            return;
          }
          
          const members = await storage.getChatChannelMembers(channelId);
          const isMember = members.some(m => m.id === userId);
          
          if (!isMember) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'You are not a member of this channel'
            }));
            return;
          }
          
          // Save the message to the database
          const sender = await storage.getUser(userId);
          
          // Create the message in the database
          const chatMessage = await storage.createChatMessage({
            channelId: channelId,
            senderId: userId,
            content: data.content
          });
          
          // Create message data to broadcast
          const messageData = {
            type: 'chat_message',
            id: chatMessage.id,
            channelId: channelId,
            content: data.content,
            sender: {
              id: sender.id,
              username: sender.username,
              displayName: sender.displayName,
              avatarInitials: sender.avatarInitials,
              avatarColor: sender.avatarColor
            },
            sentAt: chatMessage.sentAt
          };
          
          // Broadcast to all members of the channel
          for (const member of members) {
            const clientSocket = clients.get(member.id);
            if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(JSON.stringify(messageData));
            }
          }
        }
        
        // Handle typing indicator
        else if (data.type === 'typing') {
          // Validate that the user is authenticated
          if (!userId) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Not authenticated'
            }));
            return;
          }
          
          // Ensure we have a channel
          const channelId = data.channelId || socket.channelId;
          if (!channelId) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'No channel selected'
            }));
            return;
          }
          
          // Get the user
          const user = await storage.getUser(userId);
          
          // Broadcast typing indicator to channel members
          const members = await storage.getChatChannelMembers(channelId);
          
          const typingData = {
            type: 'user_typing',
            channelId: channelId,
            user: {
              id: user.id,
              username: user.username,
              displayName: user.displayName
            },
            isTyping: data.isTyping
          };
          
          // Send to all channel members except the sender
          for (const member of members) {
            if (member.id !== userId) {
              const clientSocket = clients.get(member.id);
              if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(JSON.stringify(typingData));
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    socket.on('close', () => {
      console.log('WebSocket client disconnected');
      if (userId) {
        clients.delete(userId);
        console.log(`User ${userId} disconnected from WebSocket`);
      }
    });
  });
  
  return httpServer;
}
