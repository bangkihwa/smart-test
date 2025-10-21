# Test Management System

## Overview

This full-stack web application, built with React, Express, and PostgreSQL, is designed to manage student tests and results for 목동에이원 academy. It provides an OMR-style interface for students to take tests and offers administrators comprehensive tools for student management, test creation, performance analysis, statistical reporting, and data synchronization with Airtable. The system supports a mobile-responsive design and Korean language. The business vision is to streamline academic operations, improve student performance tracking, and offer valuable insights into learning trends.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 2025)

### Student Performance Analysis Feature
- **Date**: October 21, 2025
- **Feature**: Added period-based student performance analysis in admin dashboard
- **File**: `client/src/pages/admin-dashboard.tsx`
- **Details**: New "학생별 분석" (Student Analysis) tab in admin panel with:
  - Student selection dropdown to choose individual students
  - Date range filters (start date and end date) to analyze specific periods
  - Summary statistics cards showing student info, total tests taken, and average score
  - Line chart visualizing score trends over time using Recharts
  - Detailed test results table with dates, scores, error counts, and task types
  - Complete list of assigned tasks organized by test and section
- **Use Case**: Administrators can now track individual student progress over custom time periods, identify learning patterns, and review all assigned tasks in one view
- **Design**: Responsive layout with empty states for no student selection or no results found

### Security Enhancement - Mobile Navigation Removal
- **Date**: October 21, 2025
- **Change**: Removed mobile bottom navigation completely for student users
- **File**: `client/src/components/navigation.tsx`
- **Details**: Mobile navigation component now returns `null` for non-admin users (isAdmin=false), preventing students from accessing admin panel via mobile UI
- **Security Impact**: Students can no longer see or access "관리" (Admin) button on mobile devices

### Airtable Integration Stability Fix
- **Date**: October 21, 2025
- **Issue**: Airtable SDK `eachPage()` method causing `TypeError: Cannot read properties of undefined (reading 'offset')`
- **Solution**: Replaced all `.eachPage()` calls with `.all()` method for more stable Promise-based API interaction
- **File**: `server/airtable-storage.ts`
- **Methods Updated**:
  - `getAllStudents()`
  - `searchStudents()`
  - `getAllTests()`
  - `getTestResultsByStudent()`
  - `getTestResultsByTest()`
  - `getAllTestResults()`
  - `getAllTestResultsWithRelations()`
  - `getFilteredTestResults()`
- **Error Handling**: Added try-catch blocks to all methods, returning empty arrays on errors instead of crashing
- **Testing**: Verified with 172 student records successfully loaded from Airtable

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
- **Student Performance Analysis**: Period-based individual student analysis with customizable date ranges, displaying score trends via interactive charts, detailed test results history, and complete task assignment lists.
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