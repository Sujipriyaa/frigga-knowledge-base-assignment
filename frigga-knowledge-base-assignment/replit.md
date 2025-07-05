# Document Management System

## Overview

This is a full-stack document management system built with React, Node.js, and PostgreSQL. It provides collaborative document editing with spaces, comments, permissions, and real-time features. The application uses modern web technologies including TypeScript, Tailwind CSS, and shadcn/ui components.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: PostgreSQL session store
- **Password Security**: Node.js crypto module with scrypt hashing

### Build System
- **Frontend Bundler**: Vite with React plugin
- **Backend Bundler**: esbuild for production builds
- **Development**: Hot module replacement with Vite dev server
- **TypeScript**: Strict mode enabled with path mapping

## Key Components

### Database Schema
- **Users**: Authentication and profile management
- **Spaces**: Organizational units for document grouping
- **Documents**: Core content with markdown support and visibility controls
- **Comments**: Threaded discussions on documents
- **Permissions**: Granular access control (view/edit permissions)
- **Space Members**: Space-level access management
- **Notifications**: User activity notifications
- **Document Versions**: Version history tracking

### Authentication System
- Session-based authentication with secure password hashing
- Role-based access control through document permissions
- Protected routes with authentication middleware
- User registration and login with form validation

### Document Management
- Rich text editing with markdown support
- Real-time collaboration features
- Document visibility levels (private, space, public)
- Version control and history tracking
- Search functionality across document content

### Space Management
- Team workspaces for document organization
- Member management with role-based permissions
- Space-level privacy controls
- Hierarchical document organization

## Data Flow

### Authentication Flow
1. User submits login credentials
2. Server validates against database using scrypt password comparison
3. Session created and stored in PostgreSQL
4. Client receives authenticated user data
5. Protected routes accessible based on session state

### Document Creation Flow
1. User creates document through form submission
2. Server validates permissions and document data
3. Document saved to database with author and space associations
4. Client cache updated via TanStack Query
5. User redirected to document editor

### Permission Management Flow
1. Document owner/editor grants permissions to users
2. Server validates authorization levels
3. Permission records created in database
4. Access control enforced on subsequent requests
5. UI updates based on user permission levels

## External Dependencies

### Database
- **Neon Database**: PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations
- **Connection Management**: Pool-based connections with WebSocket support

### UI Components
- **Radix UI**: Headless component primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library
- **Class Variance Authority**: Component variant management

### Development Tools
- **Replit Integration**: Development environment with live preview
- **Vite Plugins**: Runtime error overlay and code mapping
- **TypeScript**: Static type checking with strict configuration

## Deployment Strategy

### Production Build
- Frontend: Vite builds optimized React bundle to `dist/public`
- Backend: esbuild bundles Express server to `dist/index.js`
- Assets: Static files served from build directory

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Session secret via `SESSION_SECRET` environment variable
- Development vs production mode handling

### Development Workflow
- Hot module replacement for frontend development
- Automatic server restart with tsx for backend changes
- Database schema migrations with Drizzle Kit
- TypeScript compilation checking

## Changelog

Changelog:
- July 04, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.