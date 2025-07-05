import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const spaces = pgTable("spaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  slug: text("slug").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  spaceId: integer("space_id").references(() => spaces.id),
  visibility: text("visibility").notNull().default("private"), // private, public, space
  isDeleted: boolean("is_deleted").default(false).notNull(),
  views: integer("views").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentPermissions = pgTable("document_permissions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  permission: text("permission").notNull(), // view, edit
  grantedById: integer("granted_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const spaceMembers = pgTable("space_members", {
  id: serial("id").primaryKey(),
  spaceId: integer("space_id").references(() => spaces.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull().default("member"), // admin, member
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  mentions: jsonb("mentions").$type<string[]>().default([]),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  version: integer("version").notNull(),
  changes: text("changes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // mention, share, comment
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  spaces: many(spaces),
  spaceMembers: many(spaceMembers),
  comments: many(comments),
  documentPermissions: many(documentPermissions),
  notifications: many(notifications),
}));

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  owner: one(users, { fields: [spaces.ownerId], references: [users.id] }),
  documents: many(documents),
  members: many(spaceMembers),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  author: one(users, { fields: [documents.authorId], references: [users.id] }),
  space: one(spaces, { fields: [documents.spaceId], references: [spaces.id] }),
  comments: many(comments),
  permissions: many(documentPermissions),
  versions: many(documentVersions),
}));

export const documentPermissionsRelations = relations(documentPermissions, ({ one }) => ({
  document: one(documents, { fields: [documentPermissions.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentPermissions.userId], references: [users.id] }),
  grantedBy: one(users, { fields: [documentPermissions.grantedById], references: [users.id] }),
}));

export const spaceMembersRelations = relations(spaceMembers, ({ one }) => ({
  space: one(spaces, { fields: [spaceMembers.spaceId], references: [spaces.id] }),
  user: one(users, { fields: [spaceMembers.userId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  document: one(documents, { fields: [comments.documentId], references: [documents.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, { fields: [documentVersions.documentId], references: [documents.id] }),
  author: one(users, { fields: [documentVersions.authorId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSpaceSchema = createInsertSchema(spaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  views: true,
  isDeleted: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

export const insertDocumentPermissionSchema = createInsertSchema(documentPermissions).omit({
  id: true,
  createdAt: true,
});

export const insertSpaceMemberSchema = createInsertSchema(spaceMembers).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Space = typeof spaces.$inferSelect;
export type InsertSpace = z.infer<typeof insertSpaceSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type DocumentPermission = typeof documentPermissions.$inferSelect;
export type InsertDocumentPermission = z.infer<typeof insertDocumentPermissionSchema>;
export type SpaceMember = typeof spaceMembers.$inferSelect;
export type InsertSpaceMember = z.infer<typeof insertSpaceMemberSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
