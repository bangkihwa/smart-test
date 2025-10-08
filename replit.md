# Test Management System

## Overview

This is a full-stack web application for managing student tests and results at 목동에이원 academy. Built with React, Express, and PostgreSQL, the system allows students to take tests via an OMR (Optical Mark Recognition) interface and provides administrators with comprehensive tools to manage students, tests, view results, analyze performance trends, generate statistical reports, and sync data with Airtable. The application features a mobile-responsive design with Korean language support.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 2025)

### Completed Features
- **Performance Analytics Dashboard** (client/src/pages/analytics.tsx)
  - Student and grade-level filtering
  - Summary statistics (average score, total students, tests taken)
  - Score trend visualization using Recharts line charts
  - Time-based performance tracking across multiple tests

- **Statistical Reports System** (client/src/pages/reports.tsx)
  - Comprehensive filtering by test, grade level, and date range
  - Detailed summary statistics and performance metrics
  - CSV export functionality for data analysis
  - Print-friendly report views for physical documentation

- **Airtable Integration** (server/airtable-sync.ts, client/src/pages/airtable-settings.tsx)
  - Bidirectional sync with Airtable for external database backup
  - Configuration UI for API key and Base ID management
  - Data export to Airtable (students, tests, results)
  - Data import from Airtable for viewing external records
  - Real-time sync status and result display

### Pending Future Enhancements
- Parent notification system for test result alerts
- Support for different question types (true/false, short answer, essay)

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
- Recharts - Chart library for data visualization and analytics

**External Integrations**
- Airtable SDK - External database synchronization and backup
- WebSocket support for real-time features

**Development Tools**
- Replit-specific plugins for development banner and error overlay
- TypeScript for static type checking
- ESBuild for production server bundling
- Drizzle Kit for database migrations

**Fonts**
- Google Fonts (Inter, Noto Sans KR) for multilingual typography with Korean language support

## Key Application Features

### Student Features
- Mobile-optimized OMR interface for test taking (30 questions in 3 sections)
- Real-time answer selection and modification
- Instant automatic grading upon submission
- Intelligent task assignment based on error count:
  - 0-2 errors: Light task
  - 3-4 errors: Medium task
  - 5+ errors: Heavy task
- Detailed results view with section-specific feedback

### Administrator Features
- **Student Management**: CRUD operations for students (중등1-3학년, 고등1-3학년)
- **Test Creation**: Custom multi-section tests with configurable answers and assignments
- **Results Dashboard**: Comprehensive view of all test results with search and filtering
- **Performance Analytics**: 
  - Student and grade-level performance trends
  - Score visualization with line charts
  - Time-based progress tracking
  - Summary statistics
- **Statistical Reports**:
  - Comprehensive filtering (test, grade, date range)
  - Summary statistics and performance metrics
  - CSV export for data analysis
  - Print-friendly report views
- **Airtable Integration**:
  - Bidirectional database synchronization
  - Data backup to external Airtable base
  - Configuration UI for API credentials
  - Real-time sync status and results

## Technical Implementation Notes

### Grading Logic (server/routes.ts)
- Answer comparison using JSON array matching
- Section-based scoring calculation
- Automatic task assignment based on error thresholds
- Persistent storage of results with timestamps

### Analytics Implementation (client/src/pages/analytics.tsx)
- Aggregated performance queries
- Recharts integration for trend visualization
- Multi-level filtering (student, grade)
- Real-time data updates via React Query

### Airtable Sync (server/airtable-sync.ts)
- Data export to Airtable tables (Students, Tests, Test Results)
- API integration using official Airtable SDK
- Error handling and status reporting
- Configuration-based connection management