/**
 * Formats the raw CV text into structured HTML for the browser preview.
 * @param {string} rawText The plain text CV string
 * @returns {string} The structured HTML string
 */
function formatCVText(rawText) {
    if (!rawText) return '';

    // 1. CLEAN RAW TEXT
    let text = rawText;
    // Remove all ## from headings
    text = text.replace(/##/g, '');
    // Remove all ** bold markers
    text = text.replace(/\*\*/g, '');
    // Fix broken hyphens: replace " - " with "-" only inside URLs and compound words
    text = text.replace(/\b\s-\s\b/g, '-');
    // Replace * bullets with -
    text = text.replace(/^\s*\*\s+/gm, '- ');
    // Collapse 3+ blank lines into max 1 blank line
    text = text.replace(/\n{3,}/g, '\n\n');

    // Split text into lines to process
    const lines = text.split('\n');
    let html = '';
    let inList = false;

    // 2. DETECT SECTIONS & 3. CONVERT TO STRUCTURED HTML
    const sectionHeaders = [
        "PROFESSIONAL SUMMARY", "TECHNICAL SKILLS", "EDUCATION", 
        "PROJECTS", "LANGUAGES", "EXPERIENCE", "CERTIFICATIONS"
    ];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Check if line is a section header (Exact match from the list)
        if (sectionHeaders.includes(line.toUpperCase())) {
            if (inList) {
                html += '</ul>\n';
                inList = false;
            }
            html += `<h2 class="cv-section-header">${line.toUpperCase()}</h2>\n`;
            continue;
        }

        // Check if line is a bullet point (starts with -)
        if (line.startsWith('-')) {
            if (!inList) {
                html += '<ul>\n';
                inList = true;
            }
            html += `  <li>${line.substring(1).trim()}</li>\n`;
            continue;
        }

        // Close list if we hit a non-bullet line
        if (inList) {
            html += '</ul>\n';
            inList = false;
        }

        // Check if it's the contact line (contains | and email/phone/linkedin/github patterns)
        if (line.includes('|') && (line.toLowerCase().includes('email') || line.toLowerCase().includes('github.com') || line.toLowerCase().includes('linkedin.com'))) {
            html += `<p class="cv-contact">${line}</p>\n`;
            continue;
        }

        // Check if it's a tech stack line under projects (contains | but NOT the contact line)
        if (line.includes('|')) {
            html += `<p class="cv-tech-stack">${line}</p>\n`;
            continue;
        }

        // Check if it's a project title (typically short lines before bullets, or bolded in original)
        // A simple heuristic: if it's short and not a paragraph, it might be a title.
        // Or if it's right after a section header.
        // For robustness, any line that isn't a body paragraph (long text) might be a h3.
        if (line.length > 0 && line.length < 80 && !line.includes('|')) {
            html += `<h3 class="cv-project-title">${line}</h3>\n`;
            continue;
        }

        // Regular paragraphs
        html += `<p class="cv-body">${line}</p>\n`;
    }

    if (inList) {
        html += '</ul>\n';
    }

    return html;
}
