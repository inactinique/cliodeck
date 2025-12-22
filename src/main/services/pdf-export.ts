import { spawn } from 'child_process';
import { writeFile, mkdir, readFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';

// MARK: - Types

export interface ExportOptions {
  projectPath: string;
  projectType: 'notes' | 'article' | 'book' | 'presentation';
  content: string;
  outputPath?: string;
  bibliographyPath?: string;
  metadata?: {
    title?: string;
    author?: string;
    date?: string;
  };
}

interface PandocProgress {
  stage: 'preparing' | 'converting' | 'compiling' | 'complete';
  message: string;
  progress: number;
}

// MARK: - Templates

const getLatexTemplate = (projectType: string): string => {
  switch (projectType) {
    case 'notes':
      return `\\documentclass[12pt,a4paper]{article}
\\usepackage{fontspec}
\\usepackage{polyglossia}
\\setmainlanguage{french}
\\usepackage{geometry}
\\geometry{margin=2.5cm}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{fancyhdr}

% Fonts - EB Garamond with oldstyle numbers
\\setmainfont{EB Garamond}[Numbers=OldStyle]
\\setsansfont{Helvetica}
\\setmonofont{Courier New}

% Header/Footer
\\pagestyle{fancy}
\\fancyhf{}
\\rhead{\\thepage}
\\lhead{$title$}

\\title{$title$}
\\author{$author$}
\\date{$date$}

\\begin{document}

\\maketitle

$body$

\\end{document}`;

    case 'article':
      return `\\documentclass[12pt,a4paper]{article}
\\usepackage{fontspec}
\\usepackage{polyglossia}
\\setmainlanguage{french}
\\usepackage{geometry}
\\geometry{margin=2.5cm}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{fancyhdr}

% Disable section numbering
\\setcounter{secnumdepth}{0}

% Fonts - EB Garamond with oldstyle numbers
\\setmainfont{EB Garamond}[Numbers=OldStyle]
\\setsansfont{Helvetica}
\\setmonofont{Courier New}

% CSLReferences environment and commands for pandoc citeproc
\\newlength{\\cslhangindent}
\\setlength{\\cslhangindent}{1.5em}
\\newlength{\\csllabelwidth}
\\setlength{\\csllabelwidth}{3em}
\\newenvironment{CSLReferences}[2] % #1 hanging-ident, #2 entry spacing
 {\\begin{list}{}{%
  \\setlength{\\itemindent}{-1.5em}
  \\setlength{\\leftmargin}{1.5em}
  \\setlength{\\itemsep}{#2\\baselineskip}
  \\setlength{\\parsep}{0pt}}}
 {\\end{list}}
\\newcommand{\\CSLBlock}[1]{#1\\hfill\\break}
\\newcommand{\\CSLLeftMargin}[1]{\\parbox[t]{\\csllabelwidth}{}}
\\newcommand{\\CSLRightInline}[1]{\\parbox[t]{\\linewidth - \\csllabelwidth}{#1}\\break}
\\newcommand{\\CSLIndent}[1]{\\hspace{\\cslhangindent}#1}
\\DeclareRobustCommand{\\citeproctext}{}
\\DeclareRobustCommand{\\citeprocdate}{}
\\DeclareRobustCommand{\\citeprocvolume}{}
\\DeclareRobustCommand{\\citeprocissue}{}
\\DeclareRobustCommand{\\citeprocpages}{}

% Header/Footer
\\pagestyle{fancy}
\\fancyhf{}
\\rhead{\\thepage}
\\lhead{\\textit{$title$}}

\\title{$title$}
\\author{$author$}
\\date{$date$}

\\begin{document}

\\maketitle

\\begin{abstract}
$if(abstract)$
$abstract$
$else$
Résumé à compléter.
$endif$
\\end{abstract}

$body$

\\end{document}`;

    case 'book':
      return `\\documentclass[12pt,a4paper]{book}
\\usepackage{fontspec}
\\usepackage{polyglossia}
\\setmainlanguage{french}
\\usepackage{geometry}
\\geometry{margin=2.5cm}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{fancyhdr}

% Disable section numbering
\\setcounter{secnumdepth}{0}

% Fonts - EB Garamond with oldstyle numbers
\\setmainfont{EB Garamond}[Numbers=OldStyle]
\\setsansfont{Helvetica}
\\setmonofont{Courier New}

% CSLReferences environment and commands for pandoc citeproc
\\newlength{\\cslhangindent}
\\setlength{\\cslhangindent}{1.5em}
\\newlength{\\csllabelwidth}
\\setlength{\\csllabelwidth}{3em}
\\newenvironment{CSLReferences}[2] % #1 hanging-ident, #2 entry spacing
 {\\begin{list}{}{%
  \\setlength{\\itemindent}{-1.5em}
  \\setlength{\\leftmargin}{1.5em}
  \\setlength{\\itemsep}{#2\\baselineskip}
  \\setlength{\\parsep}{0pt}}}
 {\\end{list}}
\\newcommand{\\CSLBlock}[1]{#1\\hfill\\break}
\\newcommand{\\CSLLeftMargin}[1]{\\parbox[t]{\\csllabelwidth}{}}
\\newcommand{\\CSLRightInline}[1]{\\parbox[t]{\\linewidth - \\csllabelwidth}{#1}\\break}
\\newcommand{\\CSLIndent}[1]{\\hspace{\\cslhangindent}#1}
\\DeclareRobustCommand{\\citeproctext}{}
\\DeclareRobustCommand{\\citeprocdate}{}
\\DeclareRobustCommand{\\citeprocvolume}{}
\\DeclareRobustCommand{\\citeprocissue}{}
\\DeclareRobustCommand{\\citeprocpages}{}

% Header/Footer
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[LE,RO]{\\thepage}
\\fancyhead[LO]{\\textit{\\nouppercase{\\rightmark}}}
\\fancyhead[RE]{\\textit{\\nouppercase{\\leftmark}}}

\\title{$title$}
\\author{$author$}
\\date{$date$}

\\begin{document}

\\frontmatter
\\maketitle
\\tableofcontents

\\mainmatter

$body$

\\backmatter

\\end{document}`;

    default:
      return getLatexTemplate('notes');
  }
};

// MARK: - Service

export class PDFExportService {
  /**
   * Check if pandoc and xelatex are available
   */
  async checkDependencies(): Promise<{ pandoc: boolean; xelatex: boolean }> {
    const checkCommand = async (command: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const proc = spawn('which', [command]);
        proc.on('close', (code) => resolve(code === 0));
      });
    };

    const [pandoc, xelatex] = await Promise.all([
      checkCommand('pandoc'),
      checkCommand('xelatex'),
    ]);

    return { pandoc, xelatex };
  }

  /**
   * Export markdown to PDF using pandoc and xelatex
   */
  async exportToPDF(
    options: ExportOptions,
    onProgress?: (progress: PandocProgress) => void
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      // Check dependencies
      onProgress?.({ stage: 'preparing', message: 'Vérification des dépendances...', progress: 10 });
      const deps = await this.checkDependencies();

      if (!deps.pandoc) {
        throw new Error('Pandoc n\'est pas installé. Installez-le avec: brew install pandoc');
      }

      if (!deps.xelatex) {
        throw new Error('XeLaTeX n\'est pas installé. Installez-le avec: brew install --cask mactex');
      }

      // Create temporary directory for build
      const tempDir = join(tmpdir(), `mdfocus-export-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });

      onProgress?.({ stage: 'preparing', message: 'Préparation des fichiers...', progress: 20 });

      // Write markdown content
      const mdPath = join(tempDir, 'input.md');
      await writeFile(mdPath, options.content);
      console.log('📝 Markdown content written:', mdPath);
      console.log('📝 Content preview (first 500 chars):', options.content.substring(0, 500));

      // Write template
      const templatePath = join(tempDir, 'template.latex');
      const template = getLatexTemplate(options.projectType);
      await writeFile(templatePath, template);

      // Determine output path
      const outputPath = options.outputPath || join(dirname(options.projectPath), `${options.metadata?.title || 'output'}.pdf`);

      // Copy bibliography if provided
      let bibPath: string | undefined;
      if (options.bibliographyPath && existsSync(options.bibliographyPath)) {
        bibPath = join(tempDir, 'bibliography.bib');
        const bibContent = await readFile(options.bibliographyPath, 'utf-8');
        await writeFile(bibPath, bibContent);
        console.log('📚 Bibliography copied:', options.bibliographyPath, '->', bibPath);
        console.log('📚 Bibliography size:', bibContent.length, 'bytes');
      } else {
        console.log('⚠️ No bibliography found at:', options.bibliographyPath);
      }

      // Build pandoc arguments
      const pandocArgs = [
        mdPath,
        '-o', outputPath,
        '--template', templatePath,
        '--pdf-engine=xelatex',
        '--from=markdown+autolink_bare_uris',
        '--toc', // Table of contents
        '--pdf-engine-opt=-interaction=nonstopmode', // Don't stop on errors
      ];

      // Add metadata - escape special LaTeX characters
      const escapeLatex = (str: string): string => {
        return str
          .replace(/\\/g, '\\textbackslash{}')
          .replace(/[&%$#_{}]/g, '\\$&')
          .replace(/~/g, '\\textasciitilde{}')
          .replace(/\^/g, '\\textasciicircum{}');
      };

      if (options.metadata?.title) {
        pandocArgs.push('-M', `title=${escapeLatex(options.metadata.title)}`);
      }
      if (options.metadata?.author) {
        pandocArgs.push('-M', `author=${escapeLatex(options.metadata.author)}`);
      }
      if (options.metadata?.date) {
        pandocArgs.push('-M', `date=${options.metadata.date}`);
      }

      // Add bibliography if available
      if (bibPath) {
        pandocArgs.push('--bibliography', bibPath);
        pandocArgs.push('--citeproc');
      }

      // Run pandoc
      onProgress?.({ stage: 'converting', message: 'Conversion en LaTeX...', progress: 40 });

      await new Promise<void>((resolve, reject) => {
        console.log('📄 Running pandoc:', 'pandoc', pandocArgs.join(' '));

        const pandoc = spawn('pandoc', pandocArgs, {
          cwd: tempDir,
        });

        let stderr = '';

        pandoc.stderr.on('data', (data) => {
          stderr += data.toString();
          console.log('📄 Pandoc output:', data.toString());

          // Track progress based on output
          if (data.toString().includes('xelatex')) {
            onProgress?.({ stage: 'compiling', message: 'Compilation PDF en cours...', progress: 60 });
          }
        });

        pandoc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Pandoc failed with code ${code}:\n${stderr}`));
          }
        });

        pandoc.on('error', (err) => {
          reject(new Error(`Failed to start pandoc: ${err.message}`));
        });
      });

      onProgress?.({ stage: 'complete', message: 'Export terminé!', progress: 100 });

      // Cleanup temp directory
      await rm(tempDir, { recursive: true, force: true });

      console.log('✅ PDF exported successfully:', outputPath);
      return { success: true, outputPath };
    } catch (error: any) {
      console.error('❌ PDF export failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export const pdfExportService = new PDFExportService();
