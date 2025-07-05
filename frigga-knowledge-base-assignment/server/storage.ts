import { users, spaces, documents, comments, documentPermissions, spaceMembers, notifications, documentVersions, type User, type InsertUser, type Space, type InsertSpace, type Document, type InsertDocument, type Comment, type InsertComment, type DocumentPermission, type InsertDocumentPermission, type SpaceMember, type InsertSpaceMember, type Notification, type InsertNotification } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, ilike, sql, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  searchUsers(query: string): Promise<User[]>;

  // Space methods
  getSpaces(userId: number): Promise<Space[]>;
  getSpace(id: number): Promise<Space | undefined>;
  getSpaceBySlug(slug: string): Promise<Space | undefined>;
  createSpace(space: InsertSpace): Promise<Space>;
  updateSpace(id: number, space: Partial<InsertSpace>): Promise<Space>;
  deleteSpace(id: number): Promise<void>;
  getSpaceMembers(spaceId: number): Promise<(SpaceMember & { user: User })[]>;
  addSpaceMember(member: InsertSpaceMember): Promise<SpaceMember>;
  removeSpaceMember(spaceId: number, userId: number): Promise<void>;
  isSpaceMember(spaceId: number, userId: number): Promise<boolean>;

  // Document methods
  getDocuments(userId: number, spaceId?: number): Promise<(Document & { author: User, space?: Space })[]>;
  getDocument(id: number): Promise<(Document & { author: User, space?: Space }) | undefined>;
  getDocumentBySlug(slug: string, spaceId?: number): Promise<(Document & { author: User, space?: Space }) | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  searchDocuments(query: string, userId: number): Promise<(Document & { author: User, space?: Space })[]>;
  getRecentDocuments(userId: number, limit?: number): Promise<(Document & { author: User, space?: Space })[]>;
  incrementDocumentViews(id: number): Promise<void>;
  
  // Document permissions
  getDocumentPermissions(documentId: number): Promise<(DocumentPermission & { user: User })[]>;
  addDocumentPermission(permission: InsertDocumentPermission): Promise<DocumentPermission>;
  removeDocumentPermission(documentId: number, userId: number): Promise<void>;
  hasDocumentAccess(documentId: number, userId: number): Promise<boolean>;
  canEditDocument(documentId: number, userId: number): Promise<boolean>;

  // Comments
  getDocumentComments(documentId: number): Promise<(Comment & { author: User })[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: number, comment: Partial<InsertComment>): Promise<Comment>;
  deleteComment(id: number): Promise<void>;

  // Notifications
  getUserNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;

  // Version history
  getDocumentVersions(documentId: number): Promise<(typeof documentVersions.$inferSelect & { author: User })[]>;
  createDocumentVersion(documentId: number, title: string, content: string, authorId: number): Promise<void>;

  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async searchUsers(query: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.username, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.firstName, `%${query}%`),
          ilike(users.lastName, `%${query}%`)
        )
      )
      .limit(10);
  }

  // Space methods
  async getSpaces(userId: number): Promise<Space[]> {
    return await db
      .select()
      .from(spaces)
      .leftJoin(spaceMembers, eq(spaces.id, spaceMembers.spaceId))
      .where(
        or(
          eq(spaces.ownerId, userId),
          eq(spaceMembers.userId, userId)
        )
      )
      .orderBy(desc(spaces.updatedAt));
  }

  async getSpace(id: number): Promise<Space | undefined> {
    const [space] = await db.select().from(spaces).where(eq(spaces.id, id));
    return space || undefined;
  }

  async getSpaceBySlug(slug: string): Promise<Space | undefined> {
    const [space] = await db.select().from(spaces).where(eq(spaces.slug, slug));
    return space || undefined;
  }

  async createSpace(space: InsertSpace): Promise<Space> {
    const [newSpace] = await db
      .insert(spaces)
      .values(space)
      .returning();
    return newSpace;
  }

  async updateSpace(id: number, space: Partial<InsertSpace>): Promise<Space> {
    const [updatedSpace] = await db
      .update(spaces)
      .set({ ...space, updatedAt: new Date() })
      .where(eq(spaces.id, id))
      .returning();
    return updatedSpace;
  }

  async deleteSpace(id: number): Promise<void> {
    await db.delete(spaces).where(eq(spaces.id, id));
  }

  async getSpaceMembers(spaceId: number): Promise<(SpaceMember & { user: User })[]> {
    return await db
      .select()
      .from(spaceMembers)
      .innerJoin(users, eq(spaceMembers.userId, users.id))
      .where(eq(spaceMembers.spaceId, spaceId));
  }

  async addSpaceMember(member: InsertSpaceMember): Promise<SpaceMember> {
    const [newMember] = await db
      .insert(spaceMembers)
      .values(member)
      .returning();
    return newMember;
  }

  async removeSpaceMember(spaceId: number, userId: number): Promise<void> {
    await db
      .delete(spaceMembers)
      .where(
        and(
          eq(spaceMembers.spaceId, spaceId),
          eq(spaceMembers.userId, userId)
        )
      );
  }

  async isSpaceMember(spaceId: number, userId: number): Promise<boolean> {
    const [member] = await db
      .select()
      .from(spaceMembers)
      .where(
        and(
          eq(spaceMembers.spaceId, spaceId),
          eq(spaceMembers.userId, userId)
        )
      );
    return !!member;
  }

  // Document methods
  async getDocuments(userId: number, spaceId?: number): Promise<(Document & { author: User, space?: Space })[]> {
    let query = db
      .select()
      .from(documents)
      .innerJoin(users, eq(documents.authorId, users.id))
      .leftJoin(spaces, eq(documents.spaceId, spaces.id))
      .where(eq(documents.isDeleted, false));

    if (spaceId) {
      query = query.where(eq(documents.spaceId, spaceId));
    }

    // Filter by visibility and permissions
    const results = await query
      .where(
        or(
          eq(documents.visibility, 'public'),
          eq(documents.authorId, userId),
          and(
            eq(documents.visibility, 'space'),
            // Check if user is space member
            sql`EXISTS (
              SELECT 1 FROM ${spaceMembers} sm 
              WHERE sm.space_id = ${documents.spaceId} 
              AND sm.user_id = ${userId}
            )`
          )
        )
      )
      .orderBy(desc(documents.updatedAt));

    return results.map(r => ({
      ...r.documents,
      author: r.users,
      space: r.spaces || undefined,
    }));
  }

  async getDocument(id: number): Promise<(Document & { author: User, space?: Space }) | undefined> {
    const [result] = await db
      .select()
      .from(documents)
      .innerJoin(users, eq(documents.authorId, users.id))
      .leftJoin(spaces, eq(documents.spaceId, spaces.id))
      .where(and(eq(documents.id, id), eq(documents.isDeleted, false)));

    if (!result) return undefined;

    return {
      ...result.documents,
      author: result.users,
      space: result.spaces || undefined,
    };
  }

  async getDocumentBySlug(slug: string, spaceId?: number): Promise<(Document & { author: User, space?: Space }) | undefined> {
    let query = db
      .select()
      .from(documents)
      .innerJoin(users, eq(documents.authorId, users.id))
      .leftJoin(spaces, eq(documents.spaceId, spaces.id))
      .where(and(eq(documents.slug, slug), eq(documents.isDeleted, false)));

    if (spaceId) {
      query = query.where(eq(documents.spaceId, spaceId));
    }

    const [result] = await query;
    if (!result) return undefined;

    return {
      ...result.documents,
      author: result.users,
      space: result.spaces || undefined,
    };
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<void> {
    await db
      .update(documents)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(documents.id, id));
  }

  async searchDocuments(query: string, userId: number): Promise<(Document & { author: User, space?: Space })[]> {
    const results = await db
      .select()
      .from(documents)
      .innerJoin(users, eq(documents.authorId, users.id))
      .leftJoin(spaces, eq(documents.spaceId, spaces.id))
      .where(
        and(
          eq(documents.isDeleted, false),
          or(
            ilike(documents.title, `%${query}%`),
            ilike(documents.content, `%${query}%`)
          ),
          or(
            eq(documents.visibility, 'public'),
            eq(documents.authorId, userId),
            and(
              eq(documents.visibility, 'space'),
              sql`EXISTS (
                SELECT 1 FROM ${spaceMembers} sm 
                WHERE sm.space_id = ${documents.spaceId} 
                AND sm.user_id = ${userId}
              )`
            )
          )
        )
      )
      .orderBy(desc(documents.updatedAt))
      .limit(50);

    return results.map(r => ({
      ...r.documents,
      author: r.users,
      space: r.spaces || undefined,
    }));
  }

  async getRecentDocuments(userId: number, limit = 10): Promise<(Document & { author: User, space?: Space })[]> {
    const results = await db
      .select()
      .from(documents)
      .innerJoin(users, eq(documents.authorId, users.id))
      .leftJoin(spaces, eq(documents.spaceId, spaces.id))
      .where(
        and(
          eq(documents.isDeleted, false),
          or(
            eq(documents.visibility, 'public'),
            eq(documents.authorId, userId),
            and(
              eq(documents.visibility, 'space'),
              sql`EXISTS (
                SELECT 1 FROM ${spaceMembers} sm 
                WHERE sm.space_id = ${documents.spaceId} 
                AND sm.user_id = ${userId}
              )`
            )
          )
        )
      )
      .orderBy(desc(documents.updatedAt))
      .limit(limit);

    return results.map(r => ({
      ...r.documents,
      author: r.users,
      space: r.spaces || undefined,
    }));
  }

  async incrementDocumentViews(id: number): Promise<void> {
    await db
      .update(documents)
      .set({ views: sql`${documents.views} + 1` })
      .where(eq(documents.id, id));
  }

  // Document permissions
  async getDocumentPermissions(documentId: number): Promise<(DocumentPermission & { user: User })[]> {
    const results = await db
      .select()
      .from(documentPermissions)
      .innerJoin(users, eq(documentPermissions.userId, users.id))
      .where(eq(documentPermissions.documentId, documentId));

    return results.map(r => ({
      ...r.document_permissions,
      user: r.users,
    }));
  }

  async addDocumentPermission(permission: InsertDocumentPermission): Promise<DocumentPermission> {
    const [newPermission] = await db
      .insert(documentPermissions)
      .values(permission)
      .returning();
    return newPermission;
  }

  async removeDocumentPermission(documentId: number, userId: number): Promise<void> {
    await db
      .delete(documentPermissions)
      .where(
        and(
          eq(documentPermissions.documentId, documentId),
          eq(documentPermissions.userId, userId)
        )
      );
  }

  async hasDocumentAccess(documentId: number, userId: number): Promise<boolean> {
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!doc) return false;

    // Public documents are accessible to everyone
    if (doc.visibility === 'public') return true;

    // Authors have access to their own documents
    if (doc.authorId === userId) return true;

    // Check explicit permissions
    const [permission] = await db
      .select()
      .from(documentPermissions)
      .where(
        and(
          eq(documentPermissions.documentId, documentId),
          eq(documentPermissions.userId, userId)
        )
      );

    if (permission) return true;

    // Check space access
    if (doc.spaceId && doc.visibility === 'space') {
      return await this.isSpaceMember(doc.spaceId, userId);
    }

    return false;
  }

  async canEditDocument(documentId: number, userId: number): Promise<boolean> {
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!doc) return false;

    // Authors can edit their own documents
    if (doc.authorId === userId) return true;

    // Check explicit edit permissions
    const [permission] = await db
      .select()
      .from(documentPermissions)
      .where(
        and(
          eq(documentPermissions.documentId, documentId),
          eq(documentPermissions.userId, userId),
          eq(documentPermissions.permission, 'edit')
        )
      );

    return !!permission;
  }

  // Comments
  async getDocumentComments(documentId: number): Promise<(Comment & { author: User })[]> {
    const results = await db
      .select()
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(and(eq(comments.documentId, documentId), eq(comments.isDeleted, false)))
      .orderBy(asc(comments.createdAt));

    return results.map(r => ({
      ...r.comments,
      author: r.users,
    }));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return newComment;
  }

  async updateComment(id: number, comment: Partial<InsertComment>): Promise<Comment> {
    const [updatedComment] = await db
      .update(comments)
      .set({ ...comment, updatedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return updatedComment;
  }

  async deleteComment(id: number): Promise<void> {
    await db
      .update(comments)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(comments.id, id));
  }

  // Notifications
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Version history
  async getDocumentVersions(documentId: number): Promise<(typeof documentVersions.$inferSelect & { author: User })[]> {
    const results = await db
      .select()
      .from(documentVersions)
      .innerJoin(users, eq(documentVersions.authorId, users.id))
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.version));

    return results.map(r => ({
      ...r.document_versions,
      author: r.users,
    }));
  }

  async createDocumentVersion(documentId: number, title: string, content: string, authorId: number): Promise<void> {
    // Get current version number
    const [latestVersion] = await db
      .select({ version: documentVersions.version })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.version))
      .limit(1);

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    await db
      .insert(documentVersions)
      .values({
        documentId,
        title,
        content,
        authorId,
        version: nextVersion,
      });
  }
}

export const storage = new DatabaseStorage();
