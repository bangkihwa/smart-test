# 목동에이원과학학원 테스트 관리 시스템 - Design Guidelines

## Design Approach
**System**: Material Design 3 principles adapted for Korean educational context
**Rationale**: Information-dense educational platform requiring clear hierarchy, data visualization, and professional aesthetic. Material Design excels at organizing complex information while maintaining visual clarity.

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 220 70% 45% (Professional education blue)
- Primary Variant: 220 60% 35% (Darker blue for depth)
- Surface: 0 0% 98% (Off-white backgrounds)
- Surface Variant: 220 20% 95% (Card surfaces)
- Success: 142 71% 45% (Test passed)
- Warning: 38 92% 50% (Needs attention)
- Error: 0 72% 51% (Test failed)
- Text Primary: 220 15% 20%
- Text Secondary: 220 10% 45%

**Dark Mode:**
- Primary: 220 80% 65%
- Surface: 220 15% 12%
- Surface Variant: 220 12% 16%
- Text Primary: 220 5% 95%
- Text Secondary: 220 5% 70%

### B. Typography
**Korean Font Stack**: Pretendard (via CDN), "Apple SD Gothic Neo", sans-serif
**Size Scale:**
- Display: text-4xl/5xl (40-48px) - Dashboard headers
- Headline: text-2xl/3xl (24-30px) - Section titles
- Title: text-xl (20px) - Card headers, table headers
- Body: text-base (16px) - Primary content
- Label: text-sm (14px) - Form labels, metadata
- Caption: text-xs (12px) - Helper text, timestamps

**Weight**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

### C. Layout System
**Spacing Primitives**: Use 2, 3, 4, 6, 8, 12, 16 units consistently
- Component padding: p-4, p-6
- Section spacing: py-8, py-12
- Card gaps: gap-4, gap-6
- Dashboard grid: gap-6

**Responsive Grid**: Container max-w-7xl with responsive columns
- Mobile: Single column
- Tablet: 2 columns (md:grid-cols-2)
- Desktop: 3-4 columns (lg:grid-cols-3, xl:grid-cols-4)

### D. Component Library

**Navigation:**
- Sidebar navigation (desktop) with collapsible menu
- Bottom navigation (mobile) for primary sections
- Breadcrumbs for deep navigation
- Items: 대시보드, 시험 관리, 학생 관리, 성적 분석, 보고서

**Data Display:**
- Elevated cards (shadow-md) with rounded-lg corners
- Data tables with sticky headers, row hover states
- Statistics cards: Large number display + trend indicator + mini sparkline
- Progress rings/bars for completion rates
- Chart.js or Recharts for data visualization (bar, line, pie charts)

**Forms:**
- Outlined text inputs with floating labels (Material Design style)
- Dropdown selects with search functionality
- Date/time pickers for test scheduling
- Toggle switches for settings
- Radio buttons for single choice, checkboxes for multi-select

**Interactive Elements:**
- Primary buttons: Filled with primary color
- Secondary buttons: Outlined style
- Icon buttons: For compact actions
- Floating Action Button (FAB): Quick test creation (bottom-right, mobile)
- Tabs for content switching
- Badges for notification counts, status indicators

**Feedback:**
- Snackbars for operation confirmations (bottom-center)
- Linear progress bars for data loading
- Skeleton screens for content loading
- Empty states with illustration + helpful message

### E. Animations
**Minimal, Purposeful Animations:**
- Card hover: Slight elevation increase (shadow-lg transition)
- Button press: Scale down to 0.98
- Page transitions: 200ms fade
- Data loading: Subtle pulse on skeleton screens
- Chart animations: 800ms ease-out on data render

## Page-Specific Guidelines

**Dashboard:**
- Top stats row: 4 cards (총 시험 수, 평균 점수, 완료율, 이번 주 시험)
- Chart section: 2-column grid (성적 추세 line chart + 과목별 분포 bar chart)
- Recent activity table below charts
- Quick action cards for common tasks

**Test Management:**
- Filter/search bar at top
- Card grid view with test thumbnail, title, date, status badge
- List/Grid toggle
- Color-coded status: 예정 (blue), 진행중 (orange), 완료 (green)

**Student Profiles:**
- Header with student photo, name, grade, enrollment info
- Tabbed content: 시험 기록, 성적 그래프, 출석, 학부모 정보
- Performance radar chart for subject strengths

**Reports:**
- Print-friendly layout option
- Export buttons (PDF, Excel)
- Date range selector
- Comparison charts (student vs. class average)

## Images

**Hero Image: NO** - This is a utility application, not a marketing site. No large hero image needed.

**Application Images:**
1. **Student Profile Photos** (96x96px, rounded-full) - In student cards and profile headers
2. **Empty State Illustrations** (240x180px) - When no tests/data available, use simple line art illustrations showing educational themes (books, test papers, graphs)
3. **Icon System** - Material Icons CDN for consistent iconography throughout (assessment, person, analytics, report, schedule icons)

## Mobile Responsiveness
- Stack dashboard cards vertically
- Collapsible sidebar becomes bottom nav (4-5 items max)
- Charts resize to full width
- Tables become scrollable cards with key info visible
- Forms adjust to single column
- Touch targets minimum 44x44px

## Data Visualization Standards
- Consistent color coding across all charts
- Clear axis labels in Korean
- Tooltips on hover/touch
- Legend positioning: top-right for desktop, bottom for mobile
- Maximum 6 data series per chart for readability
- Use accessible color combinations for color-blind users