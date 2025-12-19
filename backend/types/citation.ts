export interface Citation {
  id: string; // Clé BibTeX
  type: string; // @book, @article, @incollection, etc.
  author: string;
  year: string;
  title: string;
  shortTitle?: string;
  journal?: string;
  publisher?: string;
  booktitle?: string;
  file?: string; // Chemin vers le PDF

  // Computed properties
  get displayString(): string;
  get details(): string | null;
  get hasPDF(): boolean;
}

export function createCitation(data: Omit<Citation, 'displayString' | 'details' | 'hasPDF'>): Citation {
  return {
    ...data,
    get displayString() {
      return `${this.author} (${this.year})`;
    },
    get details() {
      const parts: string[] = [];
      if (this.journal) parts.push(this.journal);
      if (this.publisher) parts.push(this.publisher);
      if (this.booktitle) parts.push(`in ${this.booktitle}`);
      return parts.length > 0 ? parts.join(', ') : null;
    },
    get hasPDF() {
      return !!this.file;
    },
  };
}
