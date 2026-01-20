# Feature: Tags and Custom Metadata Management

## Overview

This feature adds comprehensive support for organizing citations with tags and storing custom metadata fields. It enables researchers to:
- Add and manage tags for citations
- Filter bibliography by tags
- Store custom metadata fields not covered by standard BibTeX
- Add personal notes to citations
- Track when citations were added/modified

## Implementation Summary

### Backend Components

#### 1. Citation Type Extension (`backend/types/citation.ts`)
Extended Citation interface with:
```typescript
interface Citation {
  // ... existing fields ...

  // Tags and metadata
  tags?: string[];        // User-defined tags
  keywords?: string;      // BibTeX keywords field
  notes?: string;         // User notes
  customFields?: Record<string, string>; // Custom metadata
  dateAdded?: string;     // ISO date when added
  dateModified?: string;  // ISO date when last modified
}
```

#### 2. BibTeX Parser Enhancement (`backend/core/bibliography/BibTeXParser.ts`)
**Modified `createCitation()` method**:
- Parses tags from BibTeX `tags` field
- Preserves `keywords` and `note` fields
- Extracts custom fields (any field not in known BibTeX spec)
- Stores custom fields in `customFields` object
- Handles date fields (`dateadded`, `datemodified`)

**Key features**:
- Non-destructive parsing (preserves all unknown fields)
- Backward compatible with existing BibTeX files
- Automatic tag parsing from semicolon/comma-separated lists

#### 3. Statistics Engine Extension (`backend/services/BibliographyStats.ts`)
New tag statistics:
```typescript
interface TagStats {
  tag: string;
  count: number;
  percentage: number;
}
```

**New metrics**:
- `topTags`: Top 15 most used tags
- `citationsWithTags`: Count of tagged citations
- `tagCoverage`: Percentage of citations with tags

**New method**:
- `calculateTagStats()`: Analyzes tag usage across bibliography

### Frontend Components

#### 1. TagManager Component (`TagManager.tsx` + `.css`)
**Functionality**:
- Add/remove tags with keyboard shortcuts
- Tag autocomplete from existing tags
- Tag suggestions dropdown
- Read-only mode for display
- Visual tag chips with icons

**Key features**:
- Enter key to add tag
- Backspace to remove last tag
- Click suggestions to add
- Real-time filtering

**TagFilter Component**:
- Display all available tags with counts
- Multi-select tag filtering
- Visual indication of selected tags
- Clear all filter button

#### 2. Citation Metadata Modal (`CitationMetadataModal.tsx` + `.css`)
**Sections**:
1. **Citation Info**: Title and author display
2. **Tags**: TagManager integration
3. **Keywords**: BibTeX keywords field
4. **Notes**: Personal notes textarea
5. **Custom Fields**: Add/edit/remove custom metadata
6. **Timestamps**: Display add/modify dates

**Features**:
- Add new custom fields with key-value pairs
- Edit existing custom field values
- Remove custom fields
- Auto-save modified timestamp
- Full-screen modal with scrolling

#### 3. Bibliography Store Extension (`stores/bibliographyStore.ts`)
**New state**:
- `selectedTags: string[]` - Active tag filter

**New methods**:
```typescript
updateCitationMetadata(citationId, updates): void
getAllTags(): string[]
setTagsFilter(tags): void
clearTagsFilter(): void
```

**Modified methods**:
- `applyFilters()`: Now includes tag filtering and tag/keyword search

### Integration Points

#### 1. Citation Search Enhancement
Search now includes:
- Tag names
- Keywords field
- Notes content

#### 2. Statistics Dashboard
- New tag statistics in backend
- Tag coverage metric in Overview
- (Note: Full UI integration pending - interfaces added)

## Usage Workflow

### For Users

**Managing Tags**:
1. Select a citation in the bibliography
2. Open citation details (right-click menu or button)
3. Add tags using the tag input
4. Tags autocomplete from existing tags
5. Remove tags by clicking X on tag chip

**Filtering by Tags**:
1. Use tag filter component (shows all tags with counts)
2. Click tags to filter bibliography
3. Multiple tags = OR filter (show citations with ANY selected tag)
4. Clear filter to show all citations

**Adding Custom Metadata**:
1. Open citation metadata modal
2. Scroll to Custom Fields section
3. Enter field name and value
4. Click + to add
5. Edit values directly in the list
6. Remove fields with trash icon

**Adding Notes**:
1. Open citation metadata modal
2. Write notes in the Notes textarea
3. Notes are searchable and preserved

### For Developers

**Updating citation metadata**:
```typescript
// Get store
const updateCitationMetadata = useBibliographyStore(
  state => state.updateCitationMetadata
);

// Update tags
updateCitationMetadata(citationId, {
  tags: ['methodology', 'qualitative'],
  notes: 'Important for chapter 3',
  customFields: {
    readingStatus: 'completed',
    priority: 'high'
  }
});
```

**Getting all tags**:
```typescript
const getAllTags = useBibliographyStore(state => state.getAllTags);
const allTags = getAllTags(); // Returns sorted array of unique tags
```

**Filtering by tags**:
```typescript
const setTagsFilter = useBibliographyStore(state => state.setTagsFilter);
setTagsFilter(['methodology', 'theory']); // Show citations with either tag
```

**Clearing tag filter**:
```typescript
const clearTagsFilter = useBibliographyStore(state => state.clearTagsFilter);
clearTagsFilter();
```

## Data Structures

### BibTeX Export Format
When exporting to BibTeX, the following mappings apply:

```bibtex
@article{key2023,
  author = {Author Name},
  title = {Title},
  year = {2023},
  tags = {tag1; tag2; tag3},
  keywords = {keyword1, keyword2},
  note = {Personal notes here},
  customfield1 = {custom value 1},
  customfield2 = {custom value 2},
  dateadded = {2026-01-18T10:30:00Z},
  datemodified = {2026-01-18T15:45:00Z}
}
```

### Internal Citation Object
```typescript
{
  id: "key2023",
  key: "key2023",
  type: "article",
  author: "Author Name",
  title: "Title",
  year: "2023",
  tags: ["tag1", "tag2", "tag3"],
  keywords: "keyword1, keyword2",
  notes: "Personal notes here",
  customFields: {
    customfield1: "custom value 1",
    customfield2: "custom value 2"
  },
  dateAdded: "2026-01-18T10:30:00Z",
  dateModified: "2026-01-18T15:45:00Z"
}
```

## Technical Details

### Tag Parsing

**From BibTeX**:
- Field name: `tags`
- Separators: `;` or `,`
- Trimmed and filtered (empty tags removed)

**Storage**:
- Array of strings in Citation object
- Sorted alphabetically when displayed
- Case-sensitive

### Custom Field Handling

**Known fields (excluded from custom)**:
```typescript
const knownFields = new Set([
  'author', 'year', 'date', 'title', 'shorttitle',
  'journal', 'journaltitle', 'publisher', 'booktitle',
  'file', 'keywords', 'tags', 'note', 'abstract',
  'zoterokey', 'dateadded', 'datemodified'
]);
```

**Custom fields**:
- Any BibTeX field not in known set
- Stored as key-value pairs
- Preserved on export
- Editable via UI

### Search Implementation

Extended search now checks:
1. Author (lowercase match)
2. Title (lowercase match)
3. Year (exact match)
4. **Tags** (any tag contains query)
5. **Keywords** (lowercase match)
6. **Notes** (lowercase match)

### Tag Filtering Logic

```typescript
// Filter citations by selected tags (OR logic)
if (selectedTags.length > 0) {
  filtered = filtered.filter(citation =>
    citation.tags && citation.tags.some(tag => selectedTags.includes(tag))
  );
}
```

## UI/UX Features

**TagManager**:
- Auto-resize input
- Keyboard navigation
- Visual tag chips with gradient backgrounds
- Autocomplete dropdown (max 5 suggestions)
- Click-to-remove tags

**TagFilter**:
- Tag count badges
- Selected state highlighting
- Scrollable list for many tags
- Clear all button when tags selected

**Metadata Modal**:
- Organized sections
- Visual hierarchy
- Helpful hints under each field
- Responsive layout
- Smooth scrolling

## Performance Considerations

- Tag extraction: O(n) where n = number of citations
- Tag filtering: O(n * m) where m = average tags per citation
- Custom field storage: Minimal overhead (object reference)
- Search: Linear scan with early termination

**Optimization**:
- Tags stored as Set internally for uniqueness
- Filtered once per search/filter change
- Custom fields only created if non-empty

## Edge Cases Handled

1. **Empty tags**: Filtered out during parsing
2. **Duplicate tags**: Prevented in TagManager
3. **Missing fields**: All tag/metadata fields optional
4. **Legacy BibTeX**: Backward compatible
5. **Special characters**: Preserved in custom fields
6. **Very long notes**: Textarea with scroll
7. **Many tags**: Autocomplete shows top 5
8. **No tags**: Graceful empty state

## Future Enhancements

Potential improvements:

1. **Tag Hierarchies**:
   - Parent/child tag relationships
   - Tag categories
   - Tag synonyms

2. **Tag Colors**:
   - User-defined tag colors
   - Visual tag categories
   - Color-coded filtering

3. **Bulk Tagging**:
   - Apply tags to multiple citations
   - Smart tag suggestions
   - Tag templates

4. **Advanced Metadata**:
   - Structured custom fields (dates, numbers, lists)
   - Field validation
   - Field templates

5. **Tag Analytics**:
   - Tag co-occurrence analysis
   - Tag evolution over time
   - Tag-based citation networks

6. **Import/Export**:
   - Export tags separately (CSV, JSON)
   - Import tags from other tools
   - Tag backup/restore

## Files Modified/Created

### Created:
- `src/renderer/src/components/Bibliography/TagManager.tsx` (193 lines)
- `src/renderer/src/components/Bibliography/TagManager.css` (195 lines)
- `src/renderer/src/components/Bibliography/CitationMetadataModal.tsx` (236 lines)
- `src/renderer/src/components/Bibliography/CitationMetadataModal.css` (178 lines)
- `FEATURE_TAGS_METADATA.md` (this file)

### Modified:
- `backend/types/citation.ts` - Added tags, keywords, notes, customFields, dates
- `backend/core/bibliography/BibTeXParser.ts` - Extended createCitation to preserve custom fields
- `backend/services/BibliographyStats.ts` - Added tag statistics calculation
- `src/renderer/src/stores/bibliographyStore.ts` - Added tag filtering and metadata update methods
- `src/renderer/src/components/Bibliography/BibliographyStats.tsx` - Added tag statistics interface

### To Complete:
- Integration of CitationMetadataModal into CitationList
- Tag filter UI in BibliographyPanel
- Full tag tab in statistics dashboard
- BibTeX export with custom fields

## Dependencies

No new dependencies required. Uses existing:
- React + TypeScript
- Lucide React (Tag icon)
- Zustand (state management)
- Existing modal/button styles

## Testing Recommendations

1. **Tag Management**:
   - Add/remove tags
   - Tag autocomplete
   - Special characters in tags
   - Very long tag names

2. **Custom Fields**:
   - Add/edit/remove fields
   - Special characters in keys/values
   - Many custom fields (100+)

3. **Filtering**:
   - Single tag filter
   - Multiple tag filter (OR logic)
   - Combined tag + search filter
   - Clear filters

4. **BibTeX Parsing**:
   - Import file with tags field
   - Import file with custom fields
   - Import legacy file (no tags)
   - Round-trip export/import

5. **Performance**:
   - Large bibliography (1000+ citations)
   - Many tags per citation (50+)
   - Long notes (10,000+ characters)

6. **Edge Cases**:
   - Empty bibliography
   - Citations without tags
   - Duplicate tag names (case variations)
   - Unicode characters in tags

---

**Status**: ✅ Core Implementation Complete (BETA 3.1)
**Remaining**: UI integration for metadata modal and tag filter
**Last Updated**: 2026-01-18
**Author**: Claude Sonnet 4.5
**Feature ID**: #6 from BETA2_NOT_IMPLEMENTED.md
