# BETA 2 - Features Not Implemented

This document lists the features from the original BETA 2 plan that were **not implemented** and explains why they were postponed.

## Summary

- **Total tasks in original plan**: ~19 tasks
- **Tasks implemented**: 11 major features
- **Tasks not implemented**: 8 tasks
- **Implementation rate**: ~58%

## Not Implemented Features

### 1. Bibliography: "Update" Function to Sync with Zotero

**Description**:
- Check for updated citations in Zotero collection
- Compare with local bibliography and merge changes
- Handle additions, modifications, and deletions

**Why postponed**:
- Requires complex diff logic and conflict resolution
- Need to handle edge cases (renamed citations, merged entries, etc.)
- Requires UI for showing what changed and letting user approve/reject changes
- Better suited for BETA 3 after core workflow is validated

**Complexity**: High

---

### 2. Bibliography: Detect Modified PDFs and Propose Re-indexation

**Description**:
- Compare MD5 hashes between local and Zotero PDFs
- Detect when Zotero PDFs have been updated
- Automatically propose re-indexing modified files
- Keep track of PDF versions

**Why postponed**:
- Requires persistent MD5 hash storage in database
- Need to implement hash comparison logic
- Requires background sync process to check for updates
- Edge cases: local modifications, network issues, version conflicts
- Better as a refinement feature after core functionality is stable

**Complexity**: Medium-High

---

### 3. Bibliography: Detect and Remove Orphan PDFs

**Description**:
- Find PDFs in project directory not linked to any citation
- Offer to delete them to clean up disk space
- Safe deletion with confirmation and undo

**Why postponed**:
- Requires careful file system scanning
- Risk of deleting important files if logic is wrong
- Need safe deletion mechanism with trash/undo
- Should implement comprehensive logging before this
- Better suited for maintenance/cleanup features in later release

**Complexity**: Medium

---

### 4. Bibliography: Merge Bibliography and PDFs Tabs - Remove Manual PDF Import

**Description**:
- Completely remove the separate PDFs panel
- Integrate all PDF management into Bibliography panel
- Remove manual "Add PDF" functionality
- Everything goes through Zotero

**Why postponed**:
- Major UI refactoring affecting multiple components
- Need to migrate existing user workflows
- Requires comprehensive testing with existing projects
- Risk of breaking existing functionality
- Should gather user feedback on current dual-tab approach first

**Complexity**: High

---

### 5. Bibliography: Create Collapsible Section with Statistics and Actions

**Description**:
- Add statistics dashboard (total citations, indexed PDFs, download status, etc.)
- Add pedagogical help/tips for bibliography management
- Group all actions in organized collapsible sections
- Visual indicators and progress metrics

**Why postponed**:
- Significant UI design and development work
- Need to design information architecture carefully
- Depends on finalizing which statistics are most useful
- Better to gather usage data first to inform design
- Nice-to-have rather than core functionality

**Complexity**: Medium

---

### 6. Bibliography: Move Settings Actions to Bibliography Section

**Description**:
- Move "Index All PDFs" from Settings to Bibliography
- Move other bibliography-related settings
- Centralize bibliography-related actions in one place

**Why postponed**:
- Depends on task #5 (collapsible section) being completed
- Need to redesign Settings panel layout
- Low priority - current organization is functional
- Better to implement after gathering user feedback on current UI

**Complexity**: Low

---

### 7. RAG Settings: Three Embedding Options (with Fallback)

**Description**:
- Add dropdown to select embedding strategy:
  1. `nomic-embed-text` with fallback to `mxbai-embed-large`
  2. `mxbai-embed-large` only
  3. Without Ollama (standalone execution)
- Implement automatic fallback mechanism
- Handle model availability checking

**Why postponed**:
- Requires UI changes (dropdown, explanations)
- Backend logic for fallback mechanism
- Need to handle model availability detection
- Risk of confusion for users
- Current single-model approach is simpler and works well
- Can be added once users request more flexibility

**Complexity**: Medium

---

### 8. RAG Settings: Implement Embedding Execution Without Ollama

**Description**:
- Integrate standalone embedding model (similar to embedded Qwen)
- Download and run `nomic-embed-text` or `mxbai-embed-large` models directly
- Bypass Ollama dependency for embeddings
- Bundle embedding model with application

**Why postponed**:
- **Very high complexity** - requires significant engineering effort:
  - C++ bindings for embedding model
  - Native model format conversion (GGUF, ONNX, or custom format)
  - Memory management and optimization
  - Model download and storage management
  - Cross-platform compatibility (macOS, Windows, Linux)
- Similar scope to integrating a whole new ML framework
- Large download size (embedding models are 100-400MB)
- Maintenance burden (model updates, bug fixes)
- Current Ollama-based approach works well and is more flexible
- Better to focus on core features first

**Complexity**: Very High (similar to integrating Qwen)

---

## What Was Implemented Instead

BETA 2 successfully focused on the **core Zotero integration workflow**:

### ✅ Phase 1: UI Improvements
- Theme system (light/dark/auto with time-based switching)
- Topic Modelling status fixes
- "Open in Finder" button

### ✅ Phase 2: Zotero PDF Detection
- Zotero API integration for PDF attachments
- Extended Citation type system with Zotero metadata
- UI indicators (badges showing PDF count)

### ✅ Phase 3: PDF Download & Indexation
- Multi-PDF selection dialog
- Backend download service
- Citation card integration (download on index click)
- Download all missing PDFs button
- Batch progress tracking

### ✅ Phase 4: Configuration Improvements
- Enhanced warnings for embedding model changes
- Better UX for critical configuration changes

---

## Recommendations for Future Releases

### BETA 3 Candidates (by priority):

1. **"Update" sync function** (#1) - Most requested feature for active researchers
2. **Statistics dashboard** (#5) - Good for user engagement and visibility
3. **Orphan PDF detection** (#3) - Useful for project maintenance
4. **Modified PDF detection** (#2) - Nice refinement for power users

### BETA 4+ Candidates:

5. **Merge Bibliography/PDFs tabs** (#4) - Requires careful UX design
6. **Embedding options dropdown** (#7) - Only if users request it
7. **Settings reorganization** (#6) - Low priority polish

### Not Recommended:

8. **Standalone embeddings** (#8) - Very high effort, low benefit given Ollama works well

---

## Lessons Learned

1. **Focus on core workflow first**: Getting the basic Zotero → download → index workflow right is more valuable than advanced sync features

2. **Iterative approach**: Better to release working core features and gather feedback than to delay for complex edge cases

3. **Complexity assessment**: Tasks involving file system operations, sync logic, or native integrations require significantly more time than estimated

4. **User validation**: Should validate core workflow with users before building advanced management features

---

## Conclusion

BETA 2 successfully delivered **58% of the planned features**, focusing on the most valuable core functionality: seamless Zotero PDF integration. The unimplemented features are mostly **advanced management and synchronization features** that can be built incrementally in future releases once the core workflow has been validated by real users.

The implementation focused on quality over quantity, ensuring the features that were delivered work reliably and provide immediate value to users.
