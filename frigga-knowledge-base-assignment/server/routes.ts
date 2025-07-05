import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertDocumentSchema, insertCommentSchema, insertSpaceSchema, insertDocumentPermissionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Document routes
  app.get("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const spaceId = req.query.spaceId ? parseInt(req.query.spaceId as string) : undefined;
    const documents = await storage.getDocuments(req.user!.id, spaceId);
    res.json(documents);
  });

  app.get("/api/documents/recent", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const documents = await storage.getRecentDocuments(req.user!.id, limit);
    res.json(documents);
  });

  app.get("/api/documents/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const query = req.query.q as string;
    if (!query) return res.json([]);
    
    const documents = await storage.searchDocuments(query, req.user!.id);
    res.json(documents);
  });

  app.get("/api/documents/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const document = await storage.getDocument(id);
    
    if (!document) return res.sendStatus(404);
    
    // Check access for non-public documents
    if (document.visibility !== 'public' && !req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    if (document.visibility !== 'public') {
      const hasAccess = await storage.hasDocumentAccess(id, req.user!.id);
      if (!hasAccess) return res.sendStatus(403);
    }
    
    // Increment view count
    await storage.incrementDocumentViews(id);
    
    res.json(document);
  });

  app.post("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertDocumentSchema.parse({
        ...req.body,
        authorId: req.user!.id,
      });
      
      // Generate slug from title
      const slug = validatedData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      validatedData.slug = slug;
      
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    const canEdit = await storage.canEditDocument(id, req.user!.id);
    
    if (!canEdit) return res.sendStatus(403);
    
    try {
      // Create version history before updating
      const currentDoc = await storage.getDocument(id);
      if (currentDoc) {
        await storage.createDocumentVersion(
          id,
          currentDoc.title,
          currentDoc.content,
          req.user!.id
        );
      }
      
      const validatedData = insertDocumentSchema.partial().parse(req.body);
      
      // Update slug if title changed
      if (validatedData.title) {
        validatedData.slug = validatedData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      
      const document = await storage.updateDocument(id, validatedData);
      
      // Handle mentions in content
      if (validatedData.content) {
        const mentionRegex = /@(\w+)/g;
        const mentions = Array.from(validatedData.content.matchAll(mentionRegex), m => m[1]);
        
        for (const username of mentions) {
          const mentionedUser = await storage.getUserByUsername(username);
          if (mentionedUser) {
            // Grant read access to mentioned user
            const hasAccess = await storage.hasDocumentAccess(id, mentionedUser.id);
            if (!hasAccess) {
              await storage.addDocumentPermission({
                documentId: id,
                userId: mentionedUser.id,
                permission: 'view',
                grantedById: req.user!.id,
              });
            }
            
            // Create notification
            await storage.createNotification({
              userId: mentionedUser.id,
              type: 'mention',
              title: 'You were mentioned in a document',
              message: `${req.user!.username} mentioned you in "${document.title}"`,
              data: { documentId: id },
            });
          }
        }
      }
      
      res.json(document);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    const canEdit = await storage.canEditDocument(id, req.user!.id);
    
    if (!canEdit) return res.sendStatus(403);
    
    await storage.deleteDocument(id);
    res.sendStatus(204);
  });

  // Document permissions
  app.get("/api/documents/:id/permissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    const canEdit = await storage.canEditDocument(id, req.user!.id);
    
    if (!canEdit) return res.sendStatus(403);
    
    const permissions = await storage.getDocumentPermissions(id);
    res.json(permissions);
  });

  app.post("/api/documents/:id/permissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    const canEdit = await storage.canEditDocument(id, req.user!.id);
    
    if (!canEdit) return res.sendStatus(403);
    
    try {
      const validatedData = insertDocumentPermissionSchema.parse({
        ...req.body,
        documentId: id,
        grantedById: req.user!.id,
      });
      
      const permission = await storage.addDocumentPermission(validatedData);
      
      // Create notification
      await storage.createNotification({
        userId: validatedData.userId,
        type: 'share',
        title: 'Document shared with you',
        message: `${req.user!.username} shared a document with you`,
        data: { documentId: id },
      });
      
      res.status(201).json(permission);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/documents/:id/permissions/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const canEdit = await storage.canEditDocument(id, req.user!.id);
    
    if (!canEdit) return res.sendStatus(403);
    
    await storage.removeDocumentPermission(id, userId);
    res.sendStatus(204);
  });

  // Document versions
  app.get("/api/documents/:id/versions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    const hasAccess = await storage.hasDocumentAccess(id, req.user!.id);
    
    if (!hasAccess) return res.sendStatus(403);
    
    const versions = await storage.getDocumentVersions(id);
    res.json(versions);
  });

  // Comments
  app.get("/api/documents/:id/comments", async (req, res) => {
    const id = parseInt(req.params.id);
    const document = await storage.getDocument(id);
    
    if (!document) return res.sendStatus(404);
    
    // Check access for non-public documents
    if (document.visibility !== 'public' && !req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    if (document.visibility !== 'public') {
      const hasAccess = await storage.hasDocumentAccess(id, req.user!.id);
      if (!hasAccess) return res.sendStatus(403);
    }
    
    const comments = await storage.getDocumentComments(id);
    res.json(comments);
  });

  app.post("/api/documents/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    const hasAccess = await storage.hasDocumentAccess(id, req.user!.id);
    
    if (!hasAccess) return res.sendStatus(403);
    
    try {
      // Extract mentions from comment content
      const mentionRegex = /@(\w+)/g;
      const mentions = Array.from(req.body.content.matchAll(mentionRegex), m => m[1]);
      
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        documentId: id,
        authorId: req.user!.id,
        mentions,
      });
      
      const comment = await storage.createComment(validatedData);
      
      // Handle mentions
      for (const username of mentions) {
        const mentionedUser = await storage.getUserByUsername(username);
        if (mentionedUser) {
          // Grant read access to mentioned user
          const hasAccess = await storage.hasDocumentAccess(id, mentionedUser.id);
          if (!hasAccess) {
            await storage.addDocumentPermission({
              documentId: id,
              userId: mentionedUser.id,
              permission: 'view',
              grantedById: req.user!.id,
            });
          }
          
          // Create notification
          await storage.createNotification({
            userId: mentionedUser.id,
            type: 'mention',
            title: 'You were mentioned in a comment',
            message: `${req.user!.username} mentioned you in a comment`,
            data: { documentId: id, commentId: comment.id },
          });
        }
      }
      
      res.status(201).json(comment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Spaces
  app.get("/api/spaces", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const spaces = await storage.getSpaces(req.user!.id);
    res.json(spaces);
  });

  app.post("/api/spaces", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertSpaceSchema.parse({
        ...req.body,
        ownerId: req.user!.id,
      });
      
      const space = await storage.createSpace(validatedData);
      res.status(201).json(space);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Search users
  app.get("/api/users/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const query = req.query.q as string;
    if (!query) return res.json([]);
    
    const users = await storage.searchUsers(query);
    res.json(users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    })));
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const notifications = await storage.getUserNotifications(req.user!.id);
    res.json(notifications);
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    await storage.markNotificationAsRead(id);
    res.sendStatus(204);
  });

  app.put("/api/notifications/read-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    await storage.markAllNotificationsAsRead(req.user!.id);
    res.sendStatus(204);
  });

  const httpServer = createServer(app);
  return httpServer;
}
