# Keyboard Shortcuts - ClioDesk

This document lists all keyboard shortcuts available in ClioDesk.

> **Note**: On macOS, use `Cmd` instead of `Ctrl`.

## File

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+N` | New file | Creates a new blank Markdown file |
| `Ctrl+O` | Open file | Opens an existing Markdown file |
| `Ctrl+S` | Save | Saves the current file |
| `Ctrl+Shift+N` | New project | Creates a new project |
| `Ctrl+Shift+O` | Open project | Opens an existing project |
| `Ctrl+E` | Export PDF | Opens the PDF export dialog |
| `Ctrl+,` | Settings | Opens the configuration panel |

## Editing

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+Z` | Undo | Undoes the last modification |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo | Redoes the last undone modification |
| `Ctrl+X` | Cut | Cuts selected text |
| `Ctrl+C` | Copy | Copies selected text |
| `Ctrl+V` | Paste | Pastes text from clipboard |
| `Ctrl+A` | Select all | Selects all content |

## Markdown Formatting

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+B` | Bold | Inserts or formats text as **bold** |
| `Ctrl+I` | Italic | Inserts or formats text as _italic_ |
| `Ctrl+L` | Insert link | Inserts a Markdown link `[text](url)` |
| `Ctrl+'` | Insert citation | Inserts a BibTeX citation `[@key]` |
| `Ctrl+Shift+T` | Insert table | Inserts a Markdown table |

## View

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+K` | Toggle preview | Shows/hides Markdown preview |
| `Alt+1` | Projects panel | Activates project management panel |
| `Alt+2` | Bibliography panel | Activates bibliography panel |
| `Alt+3` | Chat panel | Activates RAG chat panel |
| `Alt+4` | PDFs panel | Activates PDF indexing panel |
| `Alt+5` | Corpus panel | Activates corpus exploration panel |
| `Alt+6` | Settings panel | Activates configuration panel |
| `Ctrl+0` | Reset zoom | Restores default zoom |
| `Ctrl++` | Zoom in | Increases zoom level |
| `Ctrl+-` | Zoom out | Decreases zoom level |
| `F11` | Full screen | Toggles full screen mode |
| `F12` | DevTools | Opens developer tools |

## Bibliography

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+Shift+B` | Import BibTeX | Opens BibTeX import dialog |
| `Ctrl+F` | Search citations | Focuses on citation search bar |

## Window

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+W` | Close window | Closes current window (on Windows/Linux) |
| `Ctrl+M` | Minimize | Minimizes window to taskbar |
| `Ctrl+Q` | Quit | Quits the application (on Windows/Linux) |

## Tips

### Quick Navigation Between Panels
Use `Alt+1` through `Alt+6` shortcuts to quickly navigate between different panels without using the mouse.

### Optimal Editing Workflow
1. `Ctrl+N` - New file
2. Write your content
3. `Ctrl+B` / `Ctrl+I` - Quick formatting
4. `Ctrl+'` - Insert citations
5. `Ctrl+K` - Preview result
6. `Ctrl+S` - Save regularly
7. `Ctrl+E` - Export to PDF when done

### Bibliographic Citations
1. `Ctrl+Shift+B` - Import your BibTeX file
2. `Alt+2` - Switch to Bibliography panel
3. `Ctrl+F` - Search for a citation
4. Click "Insert" or use `Ctrl+'` in editor

### RAG Chat
- `Alt+3` - Quickly access Chat panel
- Type your question in the input field
- Press `Enter` to send (or `Shift+Enter` if configured)
- `Escape` - Cancel an ongoing generation

## Customization

Keyboard shortcuts are defined in the `src/main/menu.ts` file. To modify them:

1. Open `src/main/menu.ts`
2. Modify the `accelerator` property of the desired menu item
3. Rebuild the application with `npm run build`
4. Restart the application

### Shortcut Format

Shortcuts use Electron Accelerator format:
- `CmdOrCtrl` - `Cmd` on macOS, `Ctrl` on Windows/Linux
- `Shift` - Shift key
- `Alt` - Alt key (Option on macOS)
- Combine with `+`: `CmdOrCtrl+Shift+B`

### Available Keys

You can use:
- Letters: `A-Z`
- Numbers: `0-9`
- Function keys: `F1-F24`
- Special keys: `Space`, `Tab`, `Enter`, `Escape`, `Backspace`, `Delete`
- Symbols: `+`, `-`, `=`, `[`, `]`, etc.

## References

- [Electron Documentation - Accelerators](https://www.electronjs.org/docs/latest/api/accelerator)
- [ClioDesk Documentation](README.md)
