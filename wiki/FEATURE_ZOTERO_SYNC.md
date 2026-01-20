# Feature: Zotero Update/Sync

## Overview

This feature enables bidirectional synchronization between your local Cliodeck bibliography and your Zotero library. It automatically detects changes (additions, modifications, deletions) and allows you to selectively apply updates.

## Implementation Summary

### Backend Components

#### 1. ZoteroDiffEngine (`backend/integrations/zotero/ZoteroDiffEngine.ts`)
- **Purpose**: Compares local citations with remote Zotero items
- **Key Methods**:
  - `detectChanges()`: Identifies added, modified, deleted, and unchanged citations
  - `compareCitations()`: Detects field-level changes including attachments
  - `zoteroItemToCitation()`: Converts Zotero API items to Citation format

**Features**:
- MD5 hash comparison for attachment changes
- Configurable comparison options (attachments, date modified)
- Field normalization for accurate comparison

#### 2. ZoteroSyncResolver (`backend/integrations/zotero/ZoteroSyncResolver.ts`)
- **Purpose**: Resolves conflicts between local and remote citations
- **Conflict Strategies**:
  - `remote`: Accept all changes from Zotero (recommended)
  - `local`: Only add new items, keep local modifications
  - `manual`: User selects each change individually

**Features**:
- Preserves local PDF file paths during merge
- Merges attachment download status
- Automatic backup creation before sync
- Detailed sync reports

#### 3. ZoteroSync Extensions (`backend/integrations/zotero/ZoteroSync.ts`)
New methods added:
- `checkForUpdates()`: Fetches remote items and compares with local
- `applyUpdates()`: Applies selected changes with chosen strategy
- `updateFromZotero()`: Complete workflow wrapper

#### 4. IPC Handlers (`src/main/ipc/handlers/zotero-handlers.ts`)
New endpoints:
- `zotero:check-updates`: Check for updates from Zotero
- `zotero:apply-updates`: Apply sync changes

#### 5. Service Layer (`src/main/services/zotero-service.ts`)
New methods:
- `checkUpdates()`: Service wrapper for checking updates
- `applyUpdates()`: Service wrapper for applying updates

### Frontend Components

#### 1. SyncPreviewModal (`src/renderer/src/components/Bibliography/SyncPreviewModal.tsx`)
Full-featured modal for reviewing and selecting changes:

**Sections**:
- Strategy selector (Remote Wins / Local Wins / Manual)
- Summary statistics (added, modified, deleted counts)
- Expandable change groups with visual indicators:
  - 🟢 **Added** citations (green)
  - 🟡 **Modified** citations with field-by-field comparison (orange)
  - 🔴 **Deleted** citations (red)

**Manual Mode Features**:
- Checkboxes for selective application
- Bulk select/deselect actions
- Side-by-side comparison for modified citations
- Field-level diff view

#### 2. ZoteroImport Integration (`src/renderer/src/components/Bibliography/ZoteroImport.tsx`)
New UI elements:
- "Update from Zotero" button with GitCompare icon
- Loading state during update check
- Automatic modal display when changes detected

#### 3. Preload API (`src/preload/index.ts`)
Exposed methods:
```typescript
zotero.checkUpdates(options)
zotero.applyUpdates(options)
```

## Usage Workflow

### For Users

1. **Check for Updates**:
   - Click "Update from Zotero" button in Bibliography panel
   - System fetches latest data from Zotero collection
   - Automatically compares with local bibliography

2. **Review Changes**:
   - Modal displays all detected changes categorized by type
   - View summary statistics at a glance
   - Expand modified citations to see field-by-field differences

3. **Choose Strategy**:
   - **Remote Wins (Recommended)**: Accept all Zotero changes, preserving local PDFs
   - **Local Wins**: Only add new citations, ignore modifications and deletions
   - **Manual**: Individually select which changes to apply

4. **Apply Changes**:
   - Click "Apply Changes" to execute sync
   - System creates backup before applying
   - Bibliography updates automatically
   - Summary notification shows results

### For Developers

**Checking for updates**:
```typescript
const result = await window.electron.zotero.checkUpdates({
  userId: 'your-user-id',
  apiKey: 'your-api-key',
  localCitations: citations,
  collectionKey: 'optional-collection-key'
});

if (result.success && result.hasChanges) {
  // Display SyncPreviewModal with result.diff
}
```

**Applying updates**:
```typescript
const result = await window.electron.zotero.applyUpdates({
  userId: 'your-user-id',
  apiKey: 'your-api-key',
  currentCitations: citations,
  diff: syncDiff,
  strategy: 'remote', // or 'local' or 'manual'
  resolution: optionalResolution // for manual strategy
});

if (result.success) {
  // Update UI with result.finalCitations
}
```

## Data Flow

```
User clicks "Update from Zotero"
  ↓
ZoteroImport.handleCheckUpdates()
  ↓
IPC: zotero:check-updates
  ↓
ZoteroService.checkUpdates()
  ↓
ZoteroSync.checkForUpdates()
  ↓
ZoteroAPI.listItems() + getItemAttachments()
  ↓
ZoteroDiffEngine.detectChanges()
  ↓
Return SyncDiff to frontend
  ↓
Display SyncPreviewModal
  ↓
User reviews and selects strategy
  ↓
User clicks "Apply Changes"
  ↓
ZoteroImport.handleApplySync()
  ↓
IPC: zotero:apply-updates
  ↓
ZoteroService.applyUpdates()
  ↓
ZoteroSync.applyUpdates()
  ↓
ZoteroSyncResolver.resolveConflicts()
  ↓
Return MergeResult to frontend
  ↓
Update bibliographyStore.citations
  ↓
Display success message
```

## Technical Details

### Diff Detection Algorithm

1. **Index Phase**: Create maps of local and remote citations by zoteroKey
2. **Added Detection**: Items in remote but not in local
3. **Deleted Detection**: Items with zoteroKey in local but not in remote
4. **Modified Detection**:
   - Compare core fields (title, author, year, type, journal, publisher)
   - Optionally compare attachments by MD5 hash
   - String normalization for accurate comparison

### Conflict Resolution

**Remote Strategy**:
- Replace all modified fields with remote values
- Preserve local `file` field (PDF path)
- Merge attachment lists, keeping download status

**Local Strategy**:
- Add new citations only
- Skip all modifications and deletions

**Manual Strategy**:
- User provides `SyncResolution` object
- Selected changes applied individually
- Unselected changes skipped

### Data Preservation

**Always Preserved**:
- Local PDF file paths (`citation.file`)
- Attachment download status
- Indexed PDFs in database (not affected by sync)

**Backup**:
- JSON backup created before applying changes
- Stored in memory during sync
- Could be extended to file-based backup

## Testing

To test this feature:

1. **Setup**:
   - Configure Zotero credentials in Settings
   - Import a collection from Zotero

2. **Make changes in Zotero**:
   - Add new items to collection
   - Modify existing item fields (title, author, etc.)
   - Delete items from collection
   - Add/remove attachments

3. **Test sync**:
   - Click "Update from Zotero"
   - Verify all changes detected correctly
   - Test each conflict strategy
   - Verify final bibliography state

4. **Edge cases**:
   - Citations without zoteroKey (local-only)
   - Items with multiple attachments
   - Empty collections
   - Network failures

## Future Enhancements

Potential improvements (see BETA2_NOT_IMPLEMENTED.md):

1. **Automatic Sync Scheduling**:
   - Background checks for updates
   - Notification when changes available

2. **PDF Version Tracking** (Feature #2):
   - Detect modified PDFs via MD5 hash
   - Propose re-indexation of updated PDFs

3. **Orphan PDF Cleanup** (Feature #3):
   - Detect PDFs not linked to any citation
   - Safe deletion with trash system

4. **Sync History**:
   - Log all sync operations
   - Ability to rollback changes

## Files Modified/Created

### Created:
- `backend/integrations/zotero/ZoteroDiffEngine.ts`
- `backend/integrations/zotero/ZoteroSyncResolver.ts`
- `src/renderer/src/components/Bibliography/SyncPreviewModal.tsx`
- `src/renderer/src/components/Bibliography/SyncPreviewModal.css`

### Modified:
- `backend/integrations/zotero/ZoteroSync.ts`
- `src/main/ipc/handlers/zotero-handlers.ts`
- `src/main/services/zotero-service.ts`
- `src/renderer/src/components/Bibliography/ZoteroImport.tsx`
- `src/preload/index.ts`

## Dependencies

No new dependencies required. Uses existing:
- Zotero Web API v3
- Electron IPC
- React + TypeScript
- Zustand store

## Performance Considerations

- Efficient map-based comparison (O(n) complexity)
- Pagination handled by ZoteroAPI
- Attachment fetching done in parallel where possible
- Large diffs handled gracefully in UI (scrollable lists)

## Security

- No credentials stored in sync data
- API calls use existing secure Zotero authentication
- Backups contain only citation metadata (no sensitive data)

---

**Status**: ✅ Fully Implemented (BETA 3.1)
**Last Updated**: 2026-01-18
**Author**: Claude Sonnet 4.5
