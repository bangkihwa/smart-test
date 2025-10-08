# Test Management System

## Overview

This is a full-stack web application for managing student tests and results. Built with React, Express, and PostgreSQL, the system allows students to take tests via an OMR (Optical Mark Recognition) interface and provides administrators with tools to manage students, tests, and view results. The application features a mobile-responsive design with Korean language support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing instead of React Router
- TanStack Query (React Query) for server state management and data fetching

**UI Component System**
- Shadcn/ui component library built on Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with custom design tokens
- CSS variables for theming support (light/dark mode ready)
- Component path aliases configured for clean imports (@/components, @/lib, @/hooks)

**State Management Strategy**
- React Query handles all server state with configured query client
- Local component state via React hooks for UI-specific state
- Toast notifications for user feedback via custom toast hook
- Form state managed through react-hook-form with Zod validation resolvers

### Backend Architecture

**Server Framework**
- Express.js for REST API endpoints
- TypeScript for type safety across server code
- Custom Vite middleware integration for development with HMR support
- Request logging middleware for API monitoring

**Database Layer**
- PostgreSQL as the primary database
- Drizzle ORM for type-safe database queries and schema management
- Neon Serverless PostgreSQL for database hosting
- WebSocket support for Neon's serverless connection pooling
- Database schema defined in shared/schema.ts for type sharing between client and server

**Data Models**
- Students: ID, name, grade level tracking
- Tests: Multi-section test structure with configurable answers and assignments
- Test Results: Student answers, scores, section-level performance tracking, and assigned tasks
- JSON columns for flexible data structures (test sections, answers, scores)

**API Structure**
- RESTful endpoints organized by resource (students, tests, test-results)
- CRUD operations for all primary entities
- Search and filtering capabilities for students and test results
- Validation using Zod schemas derived from Drizzle schema definitions

### External Dependencies

**Database Services**
- Neon Serverless PostgreSQL (@neondatabase/serverless) - Serverless PostgreSQL database with WebSocket support for connection pooling

**UI Component Libraries**
- Radix UI - Unstyled, accessible component primitives (accordion, dialog, dropdown, select, tabs, toast, etc.)
- Shadcn/ui - Pre-built components using Radix UI and Tailwind
- Embla Carousel - Touch-friendly carousel component
- Lucide React - Icon library
- CMDK - Command menu/palette component

**Form & Validation**
- React Hook Form (@hookform/resolvers) - Form state management
- Zod - Schema validation for forms and API data
- Drizzle Zod - Generate Zod schemas from Drizzle database schema

**Utilities & Tooling**
- date-fns - Date manipulation and formatting
- clsx & tailwind-merge - Conditional className utilities
- class-variance-authority - Component variant management
- nanoid - Unique ID generation

**Development Tools**
- Replit-specific plugins for development banner and error overlay
- TypeScript for static type checking
- ESBuild for production server bundling
- Drizzle Kit for database migrations

**Fonts**
- Google Fonts (Inter, Noto Sans KR) for multilingual typography with Korean language support