# Test Management System

## Overview

This full-stack web application, built with React, Express, and PostgreSQL, is designed to manage student tests and results for 목동에이원 academy. It provides an OMR-style interface for students to take tests and offers administrators comprehensive tools for student management, test creation, performance analysis, statistical reporting, and data synchronization with Airtable. The system supports a mobile-responsive design and Korean language. The business vision is to streamline academic operations, improve student performance tracking, and offer valuable insights into learning trends.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, Vite for build and HMR.
- **Routing**: Wouter for lightweight client-side routing.
- **State Management**: TanStack Query for server state, React hooks for local UI state.
- **UI Components**: Shadcn/ui (built on Radix UI) for accessible components, Tailwind CSS for styling, CSS variables for theming.
- **Form Management**: React Hook Form with Zod for validation.

### Backend Architecture
- **Server**: Express.js with TypeScript.
- **Database**: PostgreSQL (Neon Serverless PostgreSQL) with Drizzle ORM for type-safe queries and schema management.
- **Data Models**: Students, Tests (multi-section with configurable answers), Test Results (student answers, scores, section performance, assigned tasks). Uses JSON columns for flexible data structures.
- **API**: RESTful endpoints for CRUD operations, search, filtering, and validation using Zod. Includes student login, test submission with automatic grading, and result retrieval.
- **Grading Logic**: Server-side answer comparison, section-based scoring, and automatic task assignment based on error thresholds.

### Key Application Features

#### Student Features
- **Login & Session Management**: 
  - Simple ID, name, grade login with auto-creation and mismatch detection
  - localStorage-based session persistence - stays logged in across page refreshes
  - Auto-login on page load if valid session exists
  - Logout button in dashboard header clears session and returns to login
  - "메인으로 돌아가기" from test results preserves session and returns to dashboard
- **Personal Dashboard**: Cumulative stats, score trend charts (Recharts), emphasized assigned tasks, test history, new test initiation, logout button.
- **OMR Test Interface**: Mobile-optimized, 30-question OMR with instant grading, intelligent task assignment (Light, Medium, Heavy based on errors), and detailed section-specific results.
- **Period-based Report Generation**: Date range selection for comprehensive learning reports, score trend analysis, section-wise accuracy, and categorized task assignments.

#### Administrator Features
- **Management**: CRUD for students and tests.
- **Results & Analytics**: Comprehensive view of test results, performance analytics with student/grade filtering, summary statistics, and time-based tracking.
- **Statistical Reports**: Filterable reports (test, grade, date), summary metrics, CSV export (UTF-8 BOM for Korean), and print-friendly layouts.
- **Test Subject Options**: Supports various science subjects (화학, 생물, 물리, 지구과학, 통합과학 중1-3).
- **Grade-Based Test Management**: Tests can be assigned to specific grades, with students only seeing relevant tests. Admin test creation includes robust validation for all fields.
- **Test Results Enhancement**: Displays incorrect answers side-by-side with correct answers for learning feedback.
- **Academy Logo Integration**: "목동에이원과학학원" logo integrated across all pages for branding.

## External Dependencies

### Database Services
- **Neon Serverless PostgreSQL**: Serverless PostgreSQL database with WebSocket support.

### UI Component Libraries
- **Radix UI**: Accessible, unstyled component primitives.
- **Shadcn/ui**: Pre-built components leveraging Radix UI and Tailwind.
- **Embla Carousel**: Touch-friendly carousel.
- **Lucide React**: Icon library.
- **CMDK**: Command menu/palette.

### Form & Validation
- **React Hook Form**: Form state management.
- **Zod**: Schema validation.
- **Drizzle Zod**: Generates Zod schemas from Drizzle.

### Utilities & Tooling
- **date-fns**: Date manipulation.
- **clsx & tailwind-merge**: Conditional className utilities.
- **class-variance-authority**: Component variant management.
- **nanoid**: Unique ID generation.
- **Recharts**: Charting library for data visualization.

### External Integrations
- **Airtable SDK**: Bidirectional synchronization with Airtable for data backup and external record viewing.

### Development Tools
- **TypeScript**: Static type checking.
- **ESBuild**: Production server bundling.
- **Drizzle Kit**: Database migrations.

### Fonts
- **Google Fonts (Inter, Noto Sans KR)**: Multilingual typography with Korean support.