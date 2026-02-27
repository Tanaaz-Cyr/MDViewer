# MDViewer - Specification Document

## 1. Project Overview

- **Project Name:** MDViewer
- **Type:** Desktop Application (macOS)
- **Tech Stack:** Go + Wails
- **Core Functionality:** A dual-pane markdown editor/viewer with native TTS capabilities for accessibility
- **Target Users:** Users who need to read markdown files with text-to-speech support (especially useful for dyslexic users)

## 2. UI/UX Specification

### Layout Structure

- **Window:** Single main window (1200x800 default, resizable, min 800x600)
- **Navigation:** Tab-based navigation at the top
- **Layout Areas:**
  - **Header:** App title + Tab bar
  - **Main Content:** Tab-specific content area
  - **Footer:** Status bar (file path, word count)

### Visual Design

- **Color Palette:**
  - Primary Background: `#1E1E1E` (dark mode editor)
  - Secondary Background: `#252526` (panels)
  - Accent Color: `#007ACC` (tabs, buttons)
  - Text Primary: `#D4D4D4`
  - Text Secondary: `#808080`
  - Highlight Line: `#2D4F1E` (reading highlight)
  - Button Success: `#4EC9B0` (Speak)
  - Button Danger: `#F14C4C` (Stop)

- **Typography:**
  - Font Family: SF Mono (editor), -apple-system (UI)
  - Editor Font Size: 14px
  - UI Font Size: 13px

- **Spacing:**
  - Tab padding: 12px horizontal, 8px vertical
  - Content padding: 16px
  - Button padding: 8px 16px

### Components

1. **Tab Bar**
   - Two tabs: "MD Editor" and "MD Viewer"
   - Active tab: accent color underline
   - Hover: subtle background change

2. **MD Editor Tab**
   - Monaco-style text editor
   - Line numbers
   - Syntax highlighting for markdown
   - Open/Save buttons in toolbar

3. **MD Viewer Tab**
   - Rendered markdown display
   - Toolbar: Open, Speak, Stop buttons
   - Current word indicator
   - Reading progress indicator (highlighted line)

4. **Toolbar Buttons**
   - Open File: folder icon
   - Speak: speaker icon (enabled when file loaded)
   - Stop: stop icon (enabled while speaking)

5. **Status Bar**
   - File path (left)
   - Word count (center)
   - Reading position (right, when active)

## 3. Functional Specification

### Core Features

1. **File Operations**
   - Open markdown files (.md)
   - Save edited files
   - Recent files list (optional)

2. **MD Editor**
   - Raw markdown text display
   - Basic syntax highlighting
   - Line numbers
   - Word wrap toggle

3. **MD Viewer**
   - Render markdown to HTML
   - Support: headings, bold, italic, links, lists, code blocks, blockquotes
   - Clickable word selection

4. **Text-to-Speech (TTS)**
   - Native macOS TTS via `say` command or NSSpeechSynthesizer
   - Speak button: starts reading from selected word/line
   - Stop button: halts speech immediately
   - Highlight current line being read
   - Adjustable speech rate (optional)

### User Interactions & Flows

1. **Opening a File:**
   - Click "Open" → File dialog → Select .md file → Load content

2. **Switching Tabs:**
   - Click tab → Switch view (preserve content state)

3. **TTS Flow:**
   - In MD Viewer, click on any word
   - Click "Speak" → Start reading from that position
   - Current line highlighted in green
   - Click "Stop" → Halt speech immediately

### Data Flow

```
[File System] → [Go Backend] → [Wails Bridge] → [Frontend Display]
                                    ↓
                            [TTS Command] → [macOS Speech]
```

### Key Modules

1. **Backend (Go)**
   - `file.go`: File read/write operations
   - `tts.go`: Native TTS integration
   - `markdown.go`: Markdown parsing

2. **Frontend (HTML/CSS/JS)**
   - `app.js`: Main application logic
   - `tabs.js`: Tab switching
   - `editor.js`: Editor functionality
   - `viewer.js`: Viewer + TTS controls

### Edge Cases

- Empty file: Show placeholder text
- Non-.md files: Filter in file dialog
- Very large files: Warn user, load anyway
- TTS already running: Stop before starting new
- No file loaded: Disable Speak button

## 4. Acceptance Criteria

1. ✅ Application launches without errors
2. ✅ Two tabs visible and switchable
3. ✅ Can open .md files in both tabs
4. ✅ MD Editor shows raw markdown with line numbers
5. ✅ MD Viewer renders markdown correctly
6. ✅ Can click to select a word in MD Viewer
7. ✅ "Speak" button triggers native TTS
8. ✅ Current line is highlighted during speech
9. ✅ "Stop" button halts TTS immediately
10. ✅ Status bar shows file info

## 5. Technical Notes

- **Wails Version:** v2.11.0
- **Go Version:** 1.21+
- **macOS TTS:** Use `os/exec` to call `say` command with `-r` rate flag
- **Markdown Rendering:** Use `github.com/gomarkdown/markdown` or similar
- **Frontend:** Vanilla JS (no framework needed for this scope)
