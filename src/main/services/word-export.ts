import { writeFile, readFile, mkdir } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  UnderlineType,
  IPropertiesOptions,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import { marked } from 'marked';

// MARK: - Types

export interface WordExportOptions {
  projectPath: string;
  projectType: 'notes' | 'article' | 'book' | 'presentation';
  content: string;
  outputPath?: string;
  bibliographyPath?: string;
  cslPath?: string; // Path to CSL file for citation styling
  templatePath?: string; // Path to .dotx template
  metadata?: {
    title?: string;
    author?: string;
    date?: string;
    abstract?: string;
  };
}

interface WordExportProgress {
  stage: 'preparing' | 'parsing' | 'generating' | 'complete';
  message: string;
  progress: number;
}

// MARK: - Markdown Parser for Word

/**
 * Parse markdown to Word document elements
 */
class MarkdownToWordParser {
  private paragraphs: Paragraph[] = [];

  async parse(markdownContent: string): Promise<Paragraph[]> {
    this.paragraphs = [];

    // Parse markdown using marked
    const tokens = marked.lexer(markdownContent);

    for (const token of tokens) {
      await this.processToken(token);
    }

    return this.paragraphs;
  }

  private async processToken(token: marked.Token): Promise<void> {
    switch (token.type) {
      case 'heading':
        this.addHeading(token.text, token.depth);
        break;

      case 'paragraph':
        this.addParagraph(token.text);
        break;

      case 'list':
        this.addList(token);
        break;

      case 'code':
        this.addCodeBlock(token.text);
        break;

      case 'blockquote':
        this.addBlockquote(token.text);
        break;

      case 'table':
        this.addTable(token);
        break;

      case 'hr':
        this.addHorizontalRule();
        break;

      case 'space':
        // Skip empty space
        break;

      default:
        // For unsupported types, add as plain text
        if ('text' in token && typeof token.text === 'string') {
          this.addParagraph(token.text);
        }
    }
  }

  private addHeading(text: string, level: number): void {
    const headingLevels: Record<number, HeadingLevel> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    };

    this.paragraphs.push(
      new Paragraph({
        text: this.stripMarkdown(text),
        heading: headingLevels[level] || HeadingLevel.HEADING_1,
      })
    );
  }

  private addParagraph(text: string): void {
    const runs = this.parseInlineFormatting(text);
    this.paragraphs.push(
      new Paragraph({
        children: runs,
        spacing: { after: 200 },
      })
    );
  }

  private addList(token: marked.Tokens.List): void {
    for (const item of token.items) {
      const runs = this.parseInlineFormatting(item.text);
      this.paragraphs.push(
        new Paragraph({
          children: runs,
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      );

      // Handle nested lists recursively
      if (item.task !== undefined) {
        // Task list item
        const checkbox = item.checked ? '☑' : '☐';
        runs.unshift(new TextRun({ text: checkbox + ' ' }));
      }
    }
  }

  private addCodeBlock(code: string): void {
    this.paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: code,
            font: 'Courier New',
            size: 20,
          }),
        ],
        shading: {
          type: ShadingType.SOLID,
          color: 'F5F5F5',
        },
        spacing: { before: 100, after: 100 },
      })
    );
  }

  private addBlockquote(text: string): void {
    const runs = this.parseInlineFormatting(text);
    this.paragraphs.push(
      new Paragraph({
        children: runs,
        indent: { left: convertInchesToTwip(0.5) },
        italics: true,
        spacing: { before: 100, after: 100 },
      })
    );
  }

  private addTable(token: marked.Tokens.Table): void {
    const rows: TableRow[] = [];

    // Header row
    if (token.header && token.header.length > 0) {
      const headerCells = token.header.map(
        (cell) =>
          new TableCell({
            children: [
              new Paragraph({
                children: this.parseInlineFormatting(cell.text),
                bold: true,
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: 'CCCCCC',
            },
          })
      );
      rows.push(new TableRow({ children: headerCells }));
    }

    // Data rows
    for (const row of token.rows) {
      const cells = row.map(
        (cell) =>
          new TableCell({
            children: [
              new Paragraph({
                children: this.parseInlineFormatting(cell.text),
              }),
            ],
          })
      );
      rows.push(new TableRow({ children: cells }));
    }

    const table = new Table({
      rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
      },
    });

    // Tables need to be wrapped in a special container
    this.paragraphs.push(new Paragraph({ children: [] })); // Empty paragraph before table
    // @ts-ignore - Table is a valid document element
    this.paragraphs.push(table);
    this.paragraphs.push(new Paragraph({ children: [] })); // Empty paragraph after table
  }

  private addHorizontalRule(): void {
    this.paragraphs.push(
      new Paragraph({
        border: {
          bottom: {
            color: '000000',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        spacing: { before: 200, after: 200 },
      })
    );
  }

  private parseInlineFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];

    // Simple regex-based parsing for inline formatting
    // This is a simplified version - you might want to use marked's inline lexer for more accuracy
    const segments = text.split(/(\*\*.*?\*\*|__.*?__|_.*?_|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g);

    for (const segment of segments) {
      if (!segment) continue;

      // Bold: **text** or __text__
      if (/^\*\*(.*?)\*\*$/.test(segment) || /^__(.*?)__$/.test(segment)) {
        const match = segment.match(/^\*\*(.*?)\*\*$/) || segment.match(/^__(.*?)__$/);
        if (match) {
          runs.push(new TextRun({ text: match[1], bold: true }));
        }
      }
      // Italic: *text* or _text_
      else if (/^\*(.*?)\*$/.test(segment) || /^_(.*?)_$/.test(segment)) {
        const match = segment.match(/^\*(.*?)\*$/) || segment.match(/^_(.*?)_$/);
        if (match) {
          runs.push(new TextRun({ text: match[1], italics: true }));
        }
      }
      // Code: `text`
      else if (/^`(.*?)`$/.test(segment)) {
        const match = segment.match(/^`(.*?)`$/);
        if (match) {
          runs.push(
            new TextRun({
              text: match[1],
              font: 'Courier New',
              shading: { type: ShadingType.SOLID, color: 'F5F5F5' },
            })
          );
        }
      }
      // Link: [text](url)
      else if (/^\[(.*?)\]\((.*?)\)$/.test(segment)) {
        const match = segment.match(/^\[(.*?)\]\((.*?)\)$/);
        if (match) {
          runs.push(
            new TextRun({
              text: match[1],
              color: '0000FF',
              underline: { type: UnderlineType.SINGLE },
            })
          );
        }
      }
      // Plain text
      else {
        runs.push(new TextRun({ text: segment }));
      }
    }

    return runs.length > 0 ? runs : [new TextRun({ text })];
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1');
  }
}

// MARK: - Service

export class WordExportService {
  private parser = new MarkdownToWordParser();

  /**
   * Export markdown to Word document (.docx)
   */
  async exportToWord(
    options: WordExportOptions,
    onProgress?: (progress: WordExportProgress) => void
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      onProgress?.({
        stage: 'preparing',
        message: 'Préparation de l\'export Word...',
        progress: 10,
      });

      // Load abstract if needed
      let abstract = options.metadata?.abstract;
      if (
        !abstract &&
        (options.projectType === 'article' || options.projectType === 'book')
      ) {
        const abstractPath = join(options.projectPath, 'abstract.md');
        if (existsSync(abstractPath)) {
          const abstractContent = await readFile(abstractPath, 'utf-8');
          abstract = abstractContent.replace(/^#\s*Résumé\s*\n*/i, '').trim();
          console.log('📄 Abstract loaded from file:', abstractPath);
        }
      }

      onProgress?.({
        stage: 'parsing',
        message: 'Analyse du contenu Markdown...',
        progress: 30,
      });

      // Parse markdown content
      const contentParagraphs = await this.parser.parse(options.content);

      onProgress?.({
        stage: 'generating',
        message: 'Génération du document Word...',
        progress: 60,
      });

      // Create document properties
      const docProperties: IPropertiesOptions = {
        title: options.metadata?.title || 'Document',
        creator: options.metadata?.author || 'mdFocus',
        description: abstract || '',
      };

      // Build document sections
      const sections: any[] = [];

      // Title page for articles and books
      if (options.projectType === 'article' || options.projectType === 'book') {
        const titlePageChildren: Paragraph[] = [];

        // Title
        if (options.metadata?.title) {
          titlePageChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: options.metadata.title,
                  bold: true,
                  size: 48,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            })
          );
        }

        // Author
        if (options.metadata?.author) {
          titlePageChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: options.metadata.author,
                  size: 28,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            })
          );
        }

        // Date
        if (options.metadata?.date) {
          titlePageChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: options.metadata.date,
                  size: 24,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            })
          );
        }

        // Abstract
        if (abstract) {
          titlePageChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Résumé',
                  bold: true,
                  size: 28,
                }),
              ],
              spacing: { before: 400, after: 200 },
            })
          );

          titlePageChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: abstract,
                  size: 24,
                }),
              ],
              spacing: { after: 400 },
            })
          );
        }

        sections.push({
          properties: {},
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: options.metadata?.title || '',
                      italics: true,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      children: ['Page ', PageNumber.CURRENT],
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          children: [...titlePageChildren, ...contentParagraphs],
        });
      } else {
        // For notes and presentations, just add content
        sections.push({
          properties: {},
          children: contentParagraphs,
        });
      }

      // Create document
      const doc = new Document({
        creator: options.metadata?.author || 'mdFocus',
        title: options.metadata?.title || 'Document',
        description: abstract || '',
        sections,
      });

      // Determine output path
      const outputPath =
        options.outputPath ||
        join(
          dirname(options.projectPath),
          `${options.metadata?.title || 'output'}.docx`
        );

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);

      // If template is provided, we would merge it here
      // For now, just save the generated document
      await writeFile(outputPath, buffer);

      onProgress?.({
        stage: 'complete',
        message: 'Export Word terminé!',
        progress: 100,
      });

      console.log('✅ Word document exported successfully:', outputPath);
      return { success: true, outputPath };
    } catch (error: any) {
      console.error('❌ Word export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a .dotx template exists in the project directory
   */
  async findTemplate(projectPath: string): Promise<string | null> {
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(projectPath);

      const templateFile = files.find(
        (file) => extname(file).toLowerCase() === '.dotx'
      );

      if (templateFile) {
        const templatePath = join(projectPath, templateFile);
        console.log('📝 Word template found:', templatePath);
        return templatePath;
      }

      return null;
    } catch (error) {
      console.error('Error finding template:', error);
      return null;
    }
  }
}

export const wordExportService = new WordExportService();
