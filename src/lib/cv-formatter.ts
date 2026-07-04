import React from "react";

export interface CVBlock {
  type: 'name' | 'contact' | 'header' | 'bullet' | 'skills' | 'paragraph';
  text: string;
  category?: string;
  value?: string;
}

// Known section headers for strict matching
const KNOWN_SECTIONS = new Set([
  "PROFESSIONAL SUMMARY",
  "CORE SKILLS",
  "TECHNICAL SKILLS",
  "EDUCATION",
  "PROJECTS",
  "EXPERIENCE",
  "PROJECTS / EXPERIENCE",
  "WORK EXPERIENCE",
  "LANGUAGES",
  "CERTIFICATIONS"
]);

/**
 * parseCV - Parses CV text into structured blocks strictly
 */
export function parseCV(rawText: string): CVBlock[] {
  if (!rawText) return [];
  
  const lines = rawText.split('\n');
  const blocks: CVBlock[] = [];
  let nameFound = false;
  let contactFound = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Line 1 (non-empty) = Name
    if (!nameFound) {
      blocks.push({ type: 'name', text: line });
      nameFound = true;
      continue;
    }

    // Line 2 (contains @ or |) = Contact
    if (!contactFound && (line.includes('|') || line.includes('@'))) {
      blocks.push({ type: 'contact', text: line });
      contactFound = true;
      continue;
    }

    // ALL CAPS line matching known section names = Section header
    const upperLine = line.toUpperCase();
    if (KNOWN_SECTIONS.has(upperLine)) {
      blocks.push({ type: 'header', text: upperLine });
      continue;
    }

    // Lines starting with "- " or "-" = bullet
    if (line.startsWith('- ') || line.startsWith('• ')) {
      blocks.push({ type: 'bullet', text: line.substring(2).trim() });
      continue;
    }
    if (line.startsWith('-') || line.startsWith('•')) {
      blocks.push({ type: 'bullet', text: line.substring(1).trim() });
      continue;
    }

    // "Category: value, value" pattern = skill row
    // Ensure it contains a colon, the left part is short (< 30 chars), and is not a URL or contact info
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0 && colonIndex < 30 && !line.includes('|') && !line.includes('//') && !line.includes('@')) {
      const category = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      if (category && value) {
        blocks.push({
          type: 'skills',
          text: line,
          category,
          value
        });
        continue;
      }
    }

    // Everything else = paragraph
    blocks.push({ type: 'paragraph', text: line });
  }

  // Validation step: check if section headers are detected
  const hasHeaders = blocks.some(b => b.type === 'header');
  if (!hasHeaders && blocks.length > 0) {
    console.warn("CareerForge Validator: No known section headers detected in raw text. Falling back to safe paragraph render.");
  }

  return blocks;
}

/**
 * formatCVText - cleans and normalizes raw CV text for general string usage (e.g. text calculations)
 */
export function formatCVText(rawText: string): string {
  if (!rawText) return "";

  const blocks = parseCV(rawText);
  const lines: string[] = [];

  blocks.forEach(block => {
    if (block.type === 'name') {
      lines.push(block.text.toUpperCase());
    } else if (block.type === 'contact') {
      lines.push(block.text);
      lines.push('');
    } else if (block.type === 'header') {
      lines.push('');
      lines.push(block.text);
    } else if (block.type === 'bullet') {
      lines.push(`- ${block.text}`);
    } else if (block.type === 'skills') {
      lines.push(`${block.category}: ${block.value}`);
    } else {
      lines.push(block.text);
    }
  });

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * renderFormattedCV - converts CV text to styled React elements strictly matching requirements
 */
export function renderFormattedCV(rawText: string): React.ReactElement[] | null {
  if (!rawText) return null;

  const blocks = parseCV(rawText);
  const elements: React.ReactElement[] = [];
  
  // Validation check: if no headers, fall back to safe generic paragraph rendering of every line
  const hasHeaders = blocks.some(b => b.type === 'header');
  if (!hasHeaders) {
    return rawText.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, idx) => (
        React.createElement('p', { key: `fallback-${idx}`, className: "text-sm text-slate-700 mb-2 leading-relaxed font-sans" }, line)
      ));
  }

  let currentList: React.ReactElement[] = [];
  let blockIndex = 0;

  for (const block of blocks) {
    blockIndex++;

    if (block.type === 'bullet') {
      currentList.push(
        React.createElement('li', { key: `li-${blockIndex}`, className: "text-sm text-slate-700 mb-1 leading-relaxed ml-2 font-sans" }, block.text)
      );
      continue;
    }

    if (currentList.length > 0) {
      elements.push(
        React.createElement('ul', { key: `ul-${blockIndex - 1}`, className: "list-disc pl-5 mb-4 text-slate-700 font-sans" }, ...currentList)
      );
      currentList = [];
    }

    if (block.type === 'name') {
      elements.push(
        React.createElement('h1', { 
          key: `name-${blockIndex}`, 
          className: "text-3xl font-extrabold tracking-tight text-slate-900 border-b-2 border-orange-500 pb-2 mb-3 text-center font-sans" 
        }, block.text)
      );
    } else if (block.type === 'contact') {
      elements.push(
        React.createElement('p', { 
          key: `contact-${blockIndex}`, 
          className: "text-xs text-slate-600 text-center mb-6 font-sans font-medium" 
        }, block.text)
      );
    } else if (block.type === 'header') {
      elements.push(
        React.createElement('h2', { 
          key: `h2-${blockIndex}`, 
          className: "text-sm font-bold tracking-wider uppercase border-b border-slate-300 pb-1 mt-6 mb-3 text-slate-800 font-sans" 
        }, block.text)
      );
    } else if (block.type === 'skills') {
      elements.push(
        React.createElement('p', { 
          key: `skills-${blockIndex}`, 
          className: "text-sm text-slate-700 mb-2 leading-relaxed font-sans" 
        }, 
          React.createElement('strong', { className: "text-slate-800" }, `${block.category}: `),
          block.value
        )
      );
    } else if (block.type === 'paragraph') {
      elements.push(
        React.createElement('p', { 
          key: `p-${blockIndex}`, 
          className: "text-sm text-slate-700 mb-3 leading-relaxed font-sans" 
        }, block.text)
      );
    }
  }

  if (currentList.length > 0) {
    elements.push(
      React.createElement('ul', { key: `ul-end`, className: "list-disc pl-5 mb-4 text-slate-700 font-sans" }, ...currentList)
    );
  }

  return elements;
}

/**
 * exportPDF - Generates and downloads a PDF of the CV matching the on-screen layout exactly
 */
export async function exportPDF(fileName: string, rawText: string, setStatusText?: (txt: string) => void, returnBlob = false): Promise<Blob | void> {
  if (setStatusText) setStatusText("Generating PDF...");
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const blocks = parseCV(rawText);
    const hasHeaders = blocks.some(b => b.type === 'header');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    if (!hasHeaders) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const wrapped = doc.splitTextToSize(line, maxWidth);
        for (const wLine of wrapped) {
          ensureSpace(6);
          doc.text(wLine, margin, y);
          y += 6;
        }
        y += 2;
      }
      doc.save(fileName);
      if (setStatusText) setStatusText("PDF downloaded!");
      return;
    }

    for (const block of blocks) {
      if (block.type === 'name') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        const nameText = block.text.toUpperCase();
        
        const textWidth = doc.getTextWidth(nameText);
        const x = (pageWidth - textWidth) / 2;
        
        ensureSpace(12);
        doc.text(nameText, x, y);
        y += 6;

        doc.setDrawColor(249, 115, 22); // #F97316 (orange)
        doc.setLineWidth(0.8);
        doc.line(margin, y - 2, pageWidth - margin, y - 2);
        y += 4;

      } else if (block.type === 'contact') {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(80, 80, 80);
        
        const textWidth = doc.getTextWidth(block.text);
        const x = (pageWidth - textWidth) / 2;
        
        ensureSpace(6);
        doc.text(block.text, x, y);
        y += 6;
        doc.setTextColor(0, 0, 0);

      } else if (block.type === 'header') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        
        ensureSpace(10);
        y += 3;
        doc.text(block.text, margin, y);
        y += 2;

        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.35);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;

      } else if (block.type === 'skills') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        const catText = `${block.category}: `;
        const catWidth = doc.getTextWidth(catText);
        
        ensureSpace(6);
        doc.text(catText, margin, y);
        
        doc.setFont('helvetica', 'normal');
        const skillText = block.value || "";
        const wrapped = doc.splitTextToSize(skillText, maxWidth - catWidth);
        
        let firstLine = true;
        for (const wLine of wrapped) {
          if (!firstLine) {
            ensureSpace(5);
          }
          if (firstLine) {
            doc.text(wLine, margin + catWidth, y);
            firstLine = false;
          } else {
            doc.text(wLine, margin, y);
          }
          y += 5;
        }
        y += 1.5;

      } else if (block.type === 'bullet') {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        
        ensureSpace(6);
        const bulletChar = "\u2022";
        doc.text(bulletChar, margin + 2, y);
        
        const wrapped = doc.splitTextToSize(block.text, maxWidth - 6);
        let firstLine = true;
        for (const wLine of wrapped) {
          if (!firstLine) {
            ensureSpace(5);
          }
          if (firstLine) {
            doc.text(wLine, margin + 6, y);
            firstLine = false;
          } else {
            doc.text(wLine, margin + 6, y);
          }
          y += 5;
        }
        y += 1;

      } else if (block.type === 'paragraph') {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        
        const wrapped = doc.splitTextToSize(block.text, maxWidth);
        for (const wLine of wrapped) {
          ensureSpace(5);
          doc.text(wLine, margin, y);
          y += 5;
        }
        y += 2.5;
      }
    }

    if (returnBlob) {
      if (setStatusText) setStatusText("PDF generated!");
      return doc.output('blob');
    } else {
      doc.save(fileName);
      if (setStatusText) setStatusText("PDF downloaded!");
    }
  } catch (err) {
    console.error("PDF generation failed:", err);
    if (setStatusText) setStatusText("Failed to generate PDF.");
  }
}
