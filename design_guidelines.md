# TaskSpark AI - Design Guidelines

## Design Approach

**Selected System:** Linear + Notion Hybrid  
**Justification:** TaskSpark AI is a productivity tool where clarity, speed, and focus are paramount. Linear's minimalist precision combined with Notion's flexible card-based layouts creates an environment for efficient task management while showcasing AI capabilities elegantly.

**Core Principles:**
- Clarity over decoration: Every element serves task completion
- Intelligent hierarchy: AI suggestions stand out without overwhelming
- Speed-optimized: Fast visual feedback for all interactions
- Data density with breathing room: Information-rich yet scannable

---

## Color Palette

**Dark Mode (Primary):**
- Background Base: 220 15% 9% (deep slate, not pure black)
- Surface Elevated: 220 14% 12% (cards, panels)
- Surface Interactive: 220 13% 15% (hover states)
- Border Subtle: 220 12% 18%
- Text Primary: 220 10% 95%
- Text Secondary: 220 8% 65%
- Text Tertiary: 220 6% 45%

**Accent Colors:**
- AI Accent (Purple): 270 75% 65% (for AI-generated suggestions, smart features)
- Priority High: 0 85% 65% (urgent tasks)
- Priority Medium: 35 90% 60% (important tasks)
- Priority Low: 200 80% 60% (standard tasks)
- Success: 145 65% 55% (completed tasks)

**Light Mode:**
- Background: 0 0% 99%
- Surface: 0 0% 100%
- Text Primary: 220 15% 15%
- Borders: 220 10% 88%
- Same accent colors with adjusted opacity

---

## Typography

**Font Family:**
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for task IDs, timestamps)

**Scale:**
- Display (AI feature headers): 2.5rem, weight 700
- H1 (Page titles): 1.875rem, weight 600
- H2 (Section headers): 1.5rem, weight 600
- H3 (Card titles): 1.125rem, weight 500
- Body: 0.9375rem, weight 400
- Small (metadata): 0.8125rem, weight 400
- Micro (timestamps): 0.75rem, weight 400

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 1, 2, 3, 4, 6, 8, 12, 16 exclusively.
- Micro spacing (within components): 1, 2
- Component padding: 3, 4, 6
- Section spacing: 8, 12
- Page margins: 16

**Grid Structure:**
- Sidebar: Fixed 280px (collapsible to 64px icon-only)
- Main content: max-w-7xl with responsive padding
- Task cards: Grid with gap-4, responsive columns (1 → 2 → 3)
- Dashboard widgets: 2-column on desktop, stack on mobile

---

## Component Library

### Navigation
**Sidebar:**
- Dark background (220 15% 11%)
- Icon-first navigation with labels
- Active state: Purple accent bar (left edge) + subtle background
- Sections: Today, Upcoming, Projects, AI Insights, Archive

**Top Bar:**
- Search bar (prominent, center-left)
- AI chat icon (top-right)
- User profile dropdown
- Quick add task button (primary accent)

### Task Cards
**Structure:**
- Clean white/elevated surface cards
- Left accent stripe (color-coded by priority)
- Checkbox (left), title, AI suggestion badge (if applicable)
- Metadata row: Due date, project tag, assignee avatar
- Hover: Subtle lift shadow + show quick actions (edit, delete, duplicate)

**AI-Enhanced Cards:**
- Subtle purple gradient border
- "AI Suggested" micro-badge
- Smart category icon

### Forms & Inputs
**Task Creation Modal:**
- Large centered modal (max-w-2xl)
- Natural language input (prominent text area)
- AI parsing indicator (animated purple dot when processing)
- Quick add buttons: Priority, Due date, Project, Tags
- Real-time AI suggestions panel (right side on desktop)

**Input Fields:**
- Dark background matching overall theme
- Focus state: Purple ring-2
- Consistent height (h-10 for standard inputs)

### Dashboard Widgets
**AI Insights Panel:**
- Full-width hero section at dashboard top
- Shows: Productivity trends, task completion prediction, smart prioritization
- Gradient background (purple to blue, subtle)
- Icon + metric cards in 3-column grid

**Today's Focus:**
- Card-based layout
- Time-blocked view option
- Drag-to-reorder enabled
- Progress bar at top

**Upcoming Tasks:**
- Timeline view (vertical)
- Date separators with counts
- Grouped by project option

### Data Display
**Task Lists:**
- Density options: Comfortable (default), Compact, Spacious
- Alternating row backgrounds (very subtle)
- Sticky headers for date groups
- Bulk actions toolbar (appears on selection)

**Kanban Board:**
- Columns with background distinction (subtle tint)
- Card previews showing key metadata
- Drag handles visible on hover
- Column limits indicator

### Overlays & Modals
**AI Chat Assistant:**
- Slide-in panel from right (w-96)
- Chat interface with message bubbles
- Quick suggestion chips
- Context-aware based on current view

**Command Palette:**
- Centered overlay (max-w-xl)
- Fuzzy search with keyboard shortcuts
- Recent actions section
- Categorized commands (Tasks, Projects, AI, Settings)

---

## Animations

**Sparingly Used:**
- Task completion: Subtle checkmark animation + fade to success color
- AI processing: Pulsing purple dot
- Modal entry/exit: Fade + slight scale (duration-200)
- Drag and drop: Smooth position transitions
- No scroll-triggered animations
- No decorative animations

---

## Images

**Dashboard Hero (Optional but Recommended):**
- Abstract gradient illustration representing productivity/AI
- Placement: Above AI Insights Panel
- Size: Full-width, h-64 on desktop
- Style: Soft geometric shapes in purple/blue gradient
- Overlaid text: "Your AI-Powered Task Manager"

**Empty States:**
- Inline illustrations for empty task lists
- Simple line art style
- Placement: Center of empty sections
- Size: 200x200px maximum
- Examples: Empty inbox icon, completed checklist, rocket (for new projects)

**No large hero image required** - This is a utility app where function precedes visual storytelling. Dashboard hero is optional and should not dominate the interface.

---

## Key Design Details

**Consistency Rules:**
- All interactive elements have consistent focus states (purple ring)
- Card shadows: Consistent 3-level system (base, hover, active)
- Border radius: 0.5rem (rounded-lg) for all cards/modals
- Icon size: 20px standard, 16px for compact views
- Avatar sizes: 32px (standard), 24px (compact), 40px (profile)

**AI Feature Highlighting:**
- Purple is reserved exclusively for AI-related features
- AI suggestions always include context (why it was suggested)
- Dismissible AI badges (user can hide if not needed)

**Accessibility:**
- Maintain 4.5:1 contrast minimum
- Focus indicators on all interactive elements
- Keyboard navigation for all actions
- Screen reader labels for icon-only buttons