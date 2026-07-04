/**
 * ============================================
 * CV OPTIMIZER — DASHBOARD LOGIC
 * ============================================
 *
 * This file powers the entire dashboard experience:
 *  1. Authentication guard (redirects if not logged in)
 *  2. CV file upload with drag-and-drop
 *  3. Text extraction from PDF (pdf.js) and DOCX (mammoth.js)
 *  4. ATS analysis via Edge Function
 *  5. CV optimization via Edge Function
 *  6. Job matching via Edge Function
 *  7. Result rendering (scores, keywords, suggestions, job cards)
 *  8. Toast notifications and loading states
 *
 * DEPENDENCIES (loaded before this script in dashboard.html):
 *  - pdf.js (CDN) — PDF text extraction
 *  - mammoth.js (CDN) — DOCX text extraction
 *  - supabase-js (CDN) — Supabase client SDK
 *  - config.js — SUPABASE_URL, SUPABASE_ANON_KEY
 *  - supabase-client.js — getSession, getCurrentUser, signOut,
 *    requireAuth, callEdgeFunction, uploadCV
 */

// ============================================================
// GLOBAL ERROR BOUNDARIES
// ============================================================
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    if (typeof hideLoading === 'function') hideLoading();
    if (typeof showToast === 'function') showToast('An unexpected error occurred. Please refresh and try again.', 'error');
});

window.addEventListener('error', function(event) {
    console.error('Global error:', event.error || event.message);
    if (typeof hideLoading === 'function') hideLoading();
    if (typeof showToast === 'function') showToast('A critical error occurred. Please refresh the page.', 'error');
});

// ============================================================
// GLOBAL STATE
// ============================================================
/** @type {File|null} Currently selected CV file */
let selectedFile = null;

/** @type {string} Extracted plain text from the selected CV */
let extractedText = '';

/** @type {string|null} ID of the CV record in Supabase (set after upload) */
let currentCvId = null;

/** @type {Object|null} Cached analysis data for re-use */
let cachedAnalysis = null;

/** @type {string} The optimized CV text (for download/copy) */
let optimizedCvText = '';


// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Entry point — runs when the DOM is fully loaded.
 * 1. Checks authentication (redirects to auth.html if not logged in)
 * 2. Loads the user's email into the nav dropdown
 * 3. Sets up all event listeners
 */
document.addEventListener('DOMContentLoaded', async () => {
    // ── Auth guard ──
    const session = await requireAuth();
    if (!session) return; // requireAuth redirects if no session

    // ── Load user info into nav ──
    await loadUserInfo();

    // ── Set up all interactive event listeners ──
    setupUploadListeners();
    setupTextareaListeners();
    setupActionButtons();
    setupDropdown();
    setupOptimizedActions();
    setupChangesToggle();
});


// ============================================================
// USER INFO
// ============================================================

/**
 * Fetches the current user's profile and displays their
 * email address in the navigation account dropdown.
 */
async function loadUserInfo() {
    try {
        const user = await getCurrentUser();
        if (user) {
            const email = user.email || 'User';
            // Show truncated email in the nav button
            document.getElementById('account-email').textContent =
                email.length > 24 ? email.slice(0, 22) + '…' : email;
            // Full email in the dropdown panel
            document.getElementById('dropdown-email').textContent = email;
        }
    } catch (err) {
        console.error('Failed to load user info:', err);
    }
}


// ============================================================
// UPLOAD ZONE — DRAG & DROP + CLICK TO BROWSE
// ============================================================

/**
 * Attaches drag-and-drop, click-to-browse, and remove-file
 * listeners to the upload zone and hidden file input.
 */
function setupUploadListeners() {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('file-input');
    const removeBtn = document.getElementById('file-remove');

    // ── Click the zone to open file picker ──
    zone.addEventListener('click', () => input.click());

    // ── Keyboard accessibility: Enter/Space opens picker ──
    zone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            input.click();
        }
    });

    // ── File input change (user picked a file) ──
    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // ── Drag-and-drop visual feedback ──
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('drag-over');
    });
    zone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    // ── Remove file button ──
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the zone click
        clearFileSelection();
    });
}


// ============================================================
// FILE VALIDATION & SELECTION
// ============================================================

/** Maximum allowed file size: 5 MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Allowed MIME types for CV files */
const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

/** Allowed file extensions (fallback check) */
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

/**
 * Validates the selected file's type and size,
 * then updates the UI to show file info.
 * @param {File} file — The file the user selected or dropped
 */
function handleFileSelection(file) {
    // ── Validate file extension ──
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        showToast('Invalid file type. Please upload a PDF or DOCX file.', 'error');
        return;
    }

    // ── Validate MIME type (some browsers provide it) ──
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
        showToast('Invalid file type. Please upload a PDF or DOCX file.', 'error');
        return;
    }

    // ── Validate file size ──
    if (file.size > MAX_FILE_SIZE) {
        showToast('File is too large. Maximum size is 5 MB.', 'error');
        return;
    }

    // ── Store file and update UI ──
    selectedFile = file;
    displayFileInfo(file);
    enableActionButtons();
}

/**
 * Shows the selected file's name and formatted size in the upload zone.
 * @param {File} file — The selected file
 */
function displayFileInfo(file) {
    const contentEl = document.getElementById('upload-zone-content');
    const infoEl = document.getElementById('upload-file-info');
    const nameEl = document.getElementById('file-name');
    const sizeEl = document.getElementById('file-size');
    const iconEl = document.getElementById('file-icon');

    // Set icon based on file type
    iconEl.textContent = file.name.endsWith('.pdf') ? '📕' : '📘';
    nameEl.textContent = file.name;
    sizeEl.textContent = formatFileSize(file.size);

    // Swap visibility: hide the default content, show file info
    contentEl.style.display = 'none';
    infoEl.style.display = 'flex';
}

/**
 * Resets the upload zone back to its default state.
 */
function clearFileSelection() {
    selectedFile = null;
    extractedText = '';
    currentCvId = null;

    const contentEl = document.getElementById('upload-zone-content');
    const infoEl = document.getElementById('upload-file-info');
    const input = document.getElementById('file-input');

    contentEl.style.display = 'flex';
    infoEl.style.display = 'none';
    input.value = ''; // Reset the hidden input so the same file can be reselected

    disableActionButtons();
}

/**
 * Converts bytes to a human-readable string (KB or MB).
 * @param {number} bytes — File size in bytes
 * @returns {string} Formatted size string, e.g. "1.2 MB"
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}


// ============================================================
// ACTION BUTTONS — ENABLE / DISABLE
// ============================================================

/** Enable the Analyze and Match Jobs buttons */
function enableActionButtons() {
    document.getElementById('btn-analyze').disabled = false;
    document.getElementById('btn-match-jobs').disabled = false;
}

/** Disable the Analyze and Match Jobs buttons */
function disableActionButtons() {
    document.getElementById('btn-analyze').disabled = true;
    document.getElementById('btn-match-jobs').disabled = true;
}


// ============================================================
// JOB DESCRIPTION TEXTAREA
// ============================================================

/**
 * Tracks character count as the user types in the job description field.
 */
function setupTextareaListeners() {
    const textarea = document.getElementById('job-description');
    const counter = document.getElementById('jd-char-current');

    textarea.addEventListener('input', () => {
        counter.textContent = textarea.value.length;
    });
}


// ============================================================
// TEXT EXTRACTION — PDF & DOCX
// ============================================================

/**
 * Extracts plain text from the selected CV file.
 * Uses pdf.js for PDFs and mammoth.js for DOCX files.
 * @param {File} file — The CV file to extract text from
 * @returns {Promise<string>} Extracted plain text
 */
async function extractTextFromFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
        return await extractTextFromPDF(arrayBuffer);
    } else if (ext === 'docx') {
        return await extractTextFromDOCX(arrayBuffer);
    }

    throw new Error('Unsupported file format: ' + ext);
}

/**
 * Extracts text from all pages of a PDF using pdf.js.
 * @param {ArrayBuffer} arrayBuffer — The PDF file as an ArrayBuffer
 * @returns {Promise<string>} Concatenated text from all pages
 */
async function extractTextFromPDF(arrayBuffer) {
    // Configure the pdf.js worker (required for parsing)
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    // Iterate through every page and extract text
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
    }

    return fullText.trim();
}

/**
 * Extracts raw text from a DOCX file using mammoth.js.
 * @param {ArrayBuffer} arrayBuffer — The DOCX file as an ArrayBuffer
 * @returns {Promise<string>} Extracted plain text
 */
async function extractTextFromDOCX(arrayBuffer) {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
}


// ============================================================
// ACTION BUTTON EVENT LISTENERS
// ============================================================

/**
 * Sets up click handlers for the primary action buttons:
 * "Analyze & Optimize" and "Find Matching Jobs".
 */
function setupActionButtons() {
    document.getElementById('btn-analyze').addEventListener('click', handleAnalyzeAndOptimize);
    document.getElementById('btn-match-jobs').addEventListener('click', handleMatchJobs);
}

// ============================================================
// ANALYZE & OPTIMIZE FLOW
// ============================================================

/**
 * Full pipeline triggered by the "Analyze & Optimize" button:
 *  1. Upload CV file to Supabase Storage
 *  2. Extract text from the file (PDF/DOCX)
 *  3. Call analyze-cv Edge Function
 *  4. Display analysis results
 *  5. Call optimize-cv Edge Function
 *  6. Display optimized CV
 */
async function handleAnalyzeAndOptimize() {
    if (!selectedFile) {
        showToast('Please select a CV file first.', 'warning');
        return;
    }

    try {
        // ── Step 1: Upload the file ──
        showLoading('Uploading CV...');
        const user = await getCurrentUser();
        if (!user) {
            hideLoading();
            showToast('Session expired. Please log in again.', 'error');
            return;
        }

        const uploadResult = await uploadCV(selectedFile, user.id);
        if (uploadResult.error) {
            hideLoading();
            showToast('Upload failed: ' + uploadResult.error.message, 'error');
            return;
        }

        // ── Step 2: Extract text from the file ──
        showLoading('Reading your CV...');
        try {
            extractedText = await extractTextFromFile(selectedFile);
        } catch (extractErr) {
            hideLoading();
            showToast('Could not read this file. Please make sure it is a valid PDF or DOCX.', 'error');
            console.error('Text extraction error:', extractErr);
            return;
        }

        if (!extractedText || extractedText.trim().length < 50) {
            hideLoading();
            showToast('Could not extract enough text from this file. It may be scanned or image-based.', 'warning');
            return;
        }

        // ── Step 3: Analyze the CV ──
        showLoading('Analyzing your CV...');
        const jobDescription = document.getElementById('job-description').value.trim();
        const analyzePayload = {
            cv_text: extractedText,
            cv_path: uploadResult.path,
            file_name: selectedFile.name
        };
        if (jobDescription) analyzePayload.job_description = jobDescription;

        const analyzeResult = await callEdgeFunction('analyze-cv', analyzePayload);
        if (analyzeResult.error) {
            hideLoading();
            showToast('Analysis failed: ' + analyzeResult.error.message, 'error');
            return;
        }

        // Store the CV id for subsequent calls
        currentCvId = analyzeResult.data.cv_id || null;
        cachedAnalysis = analyzeResult.data;

        // Render analysis results
        displayAnalysisResults(analyzeResult.data);

        // ── Step 4: Optimize the CV ──
        showLoading('Optimizing your CV...');
        const optimizePayload = {
            cv_text: extractedText,
            cv_id: currentCvId
        };
        if (jobDescription) optimizePayload.job_description = jobDescription;

        const optimizeResult = await callEdgeFunction('optimize-cv', optimizePayload);
        if (optimizeResult.error) {
            hideLoading();
            showToast('Optimization failed: ' + optimizeResult.error.message, 'error');
            // Still show the analysis results even if optimization fails
            return;
        }

        // Render optimized CV
        displayOptimizedCV(optimizeResult.data, jobDescription);

        // ── Done! ──
        hideLoading();
        showToast('Analysis and optimization complete!', 'success');

        // Smooth scroll to results
        document.getElementById('section-results').scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        hideLoading();
        showToast('An unexpected error occurred. Please try again.', 'error');
        console.error('Analyze & Optimize error:', err);
    }
}


// ============================================================
// JOB MATCHING FLOW
// ============================================================

/**
 * Triggered by the "Find Matching Jobs" button.
 * Uploads the CV (if not already uploaded), extracts text,
 * then calls the match-jobs Edge Function.
 */
async function handleMatchJobs() {
    if (!selectedFile) {
        showToast('Please select a CV file first.', 'warning');
        return;
    }

    try {
        // If text hasn't been extracted yet, do it now
        if (!extractedText) {
            showLoading('Reading your CV...');
            const user = await getCurrentUser();
            if (!user) {
                hideLoading();
                showToast('Session expired. Please log in again.', 'error');
                return;
            }

            // Upload if not already uploaded
            if (!currentCvId) {
                showLoading('Uploading CV...');
                const uploadResult = await uploadCV(selectedFile, user.id);
                if (uploadResult.error) {
                    hideLoading();
                    showToast('Upload failed: ' + uploadResult.error.message, 'error');
                    return;
                }
            }

            try {
                extractedText = await extractTextFromFile(selectedFile);
            } catch (extractErr) {
                hideLoading();
                showToast('Could not read this file. Please ensure it is a valid PDF or DOCX.', 'error');
                return;
            }
        }

        // ── Call the match-jobs Edge Function ──
        showLoading('Finding matching jobs...');
        const matchPayload = { cv_text: extractedText };
        if (currentCvId) matchPayload.cv_id = currentCvId;

        const matchResult = await callEdgeFunction('match-jobs', matchPayload);
        if (matchResult.error) {
            hideLoading();
            showToast('Job matching failed: ' + matchResult.error.message, 'error');
            return;
        }

        // Render job cards
        displayJobMatches(matchResult.data);

        hideLoading();
        showToast('Job matches found!', 'success');

        // Scroll to jobs section
        document.getElementById('section-jobs').scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        hideLoading();
        showToast('An unexpected error occurred. Please try again.', 'error');
        console.error('Job matching error:', err);
    }
}


// ============================================================
// DISPLAY: ANALYSIS RESULTS
// ============================================================

/**
 * Populates Section 2 with data returned from the analyze-cv Edge Function.
 * @param {Object} data — API response containing score, feedback, keywords, suggestions
 */
function displayAnalysisResults(data) {
    const section = document.getElementById('section-results');
    section.style.display = 'block';

    // ── ATS Score with animation ──
    const score = data.ats_score ?? data.score ?? 0;
    animateATSScore(score);

    // ── Overall Feedback ──
    const feedbackEl = document.getElementById('feedback-text');
    feedbackEl.textContent = data.feedback || data.overall_feedback || 'No feedback available.';

    // ── Keywords ──
    renderKeywords(data.keywords_found || [], data.keywords_missing || []);

    // ── Suggestions ──
    renderSuggestions(data.suggestions || []);
}


// ============================================================
// DISPLAY: ATS SCORE ANIMATION
// ============================================================

/**
 * Animates the circular ATS score indicator from 0 to the target score.
 * Uses requestAnimationFrame for buttery-smooth animation.
 * Colors: red (0-40), orange (41-70), green (71-100).
 *
 * @param {number} targetScore — The score to animate to (0–100)
 */
function animateATSScore(targetScore) {
    const circle = document.getElementById('ats-circle-progress');
    const valueEl = document.getElementById('ats-score-value');
    const container = document.getElementById('ats-circle-container');

    // SVG circle math: circumference = 2 * π * r (r=52)
    const circumference = 2 * Math.PI * 52; // ≈ 326.73
    const duration = 1500; // Animation duration in ms
    let startTime = null;

    // Determine color based on score range
    let color;
    if (targetScore <= 40) {
        color = 'hsl(0, 72%, 56%)';     // Red
    } else if (targetScore <= 70) {
        color = 'hsl(33, 90%, 55%)';    // Orange
    } else {
        color = 'hsl(145, 63%, 45%)';   // Green
    }
    circle.style.stroke = color;

    // Add a CSS class for score range (useful for additional styling)
    container.className = 'ats-circle-container';
    if (targetScore <= 40) container.classList.add('score-low');
    else if (targetScore <= 70) container.classList.add('score-medium');
    else container.classList.add('score-high');

    /**
     * Animation frame callback — eases from 0 to targetScore
     */
    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic for a satisfying deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentScore = Math.round(eased * targetScore);

        // Update the displayed number
        valueEl.textContent = currentScore;

        // Update the SVG stroke offset (higher offset = less of the circle shown)
        const offset = circumference - (eased * targetScore / 100) * circumference;
        circle.style.strokeDashoffset = offset;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    // Reset before animating
    circle.style.strokeDashoffset = circumference;
    valueEl.textContent = '0';

    requestAnimationFrame(animate);
}


// ============================================================
// DISPLAY: KEYWORDS
// ============================================================

/**
 * Renders keyword chips into the Found and Missing keyword grids.
 * @param {string[]} found — Keywords present in the CV
 * @param {string[]} missing — Keywords that should be added
 */
function renderKeywords(found, missing) {
    const foundGrid = document.getElementById('keywords-found-grid');
    const missingGrid = document.getElementById('keywords-missing-grid');

    // Clear previous results
    foundGrid.innerHTML = '';
    missingGrid.innerHTML = '';

    if (found.length === 0) {
        foundGrid.innerHTML = '<p class="keywords-empty">No keywords detected</p>';
    } else {
        found.forEach(keyword => {
            const chip = document.createElement('span');
            chip.className = 'keyword-chip keyword-found';
            chip.textContent = keyword;
            foundGrid.appendChild(chip);
        });
    }

    if (missing.length === 0) {
        missingGrid.innerHTML = '<p class="keywords-empty">Nothing missing — great job!</p>';
    } else {
        missing.forEach(keyword => {
            const chip = document.createElement('span');
            chip.className = 'keyword-chip keyword-missing';
            chip.textContent = keyword;
            missingGrid.appendChild(chip);
        });
    }
}


// ============================================================
// DISPLAY: SUGGESTIONS
// ============================================================

/**
 * Renders a numbered list of improvement suggestions.
 * @param {string[]} suggestions — Array of suggestion strings
 */
function renderSuggestions(suggestions) {
    const list = document.getElementById('suggestions-list');
    list.innerHTML = '';

    if (suggestions.length === 0) {
        list.innerHTML = '<li class="suggestion-item">No suggestions — your CV looks great!</li>';
        return;
    }

    suggestions.forEach((suggestion, index) => {
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        // Choose an icon based on index (rotating through a set)
        const icons = ['🔧', '📝', '🎯', '✨', '📌', '💬', '🧩', '🚀'];
        const icon = icons[index % icons.length];
        li.innerHTML = `<span class="suggestion-icon">${icon}</span> ${escapeHTML(suggestion)}`;
        list.appendChild(li);
    });
}


// ============================================================
// DISPLAY: OPTIMIZED CV
// ============================================================

/**
 * Populates Section 3 with the optimized CV text and changes list.
 * @param {Object} data — API response with optimized_text and changes
 * @param {string} jobDescription — The job description (if any) for the tailored note
 */
function displayOptimizedCV(data, jobDescription) {
    const section = document.getElementById('section-optimized');
    section.style.display = 'block';

    // ── Optimized text preview ──
    optimizedCvText = data.optimized_cv_text || data.optimized_text || data.optimized_cv || '';
    const previewEl = document.getElementById('cv-preview-container');
    previewEl.innerHTML = formatCVText(optimizedCvText);

    // ── Changes list ──
    const changes = data.changes || data.changes_made || [];
    renderChanges(changes);

    // ── Tailored-for note ──
    if (jobDescription && jobDescription.length > 0) {
        const noteEl = document.getElementById('tailored-note');
        const previewText = document.getElementById('tailored-jd-preview');
        previewText.textContent = jobDescription.substring(0, 50) + (jobDescription.length > 50 ? '...' : '');
        noteEl.style.display = 'inline-block';
    }
}

/**
 * Renders the list of changes made by the optimizer.
 * @param {string[]} changes — Array of change description strings
 */
function renderChanges(changes) {
    const list = document.getElementById('changes-list');
    list.innerHTML = '';

    if (changes.length === 0) {
        const li = document.createElement('li');
        li.className = 'change-item';
        li.textContent = 'Minor formatting and wording improvements applied.';
        list.appendChild(li);
        return;
    }

    changes.forEach(change => {
        const li = document.createElement('li');
        li.className = 'change-item';
        li.textContent = change;
        list.appendChild(li);
    });
}

/**
 * Sets up the collapsible changes toggle.
 */
function setupChangesToggle() {
    const toggle = document.getElementById('changes-toggle');
    const wrapper = document.getElementById('changes-list-wrapper');
    const chevron = document.getElementById('toggle-chevron');

    toggle.addEventListener('click', () => {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !isExpanded);
        wrapper.style.display = isExpanded ? 'none' : 'block';
        chevron.textContent = isExpanded ? '▾' : '▴';
    });
}


// ============================================================
// DISPLAY: JOB MATCHES
// ============================================================

/**
 * Renders job match cards in Section 4.
 * @param {Object} data — API response containing a jobs array
 */
function displayJobMatches(data) {
    const section = document.getElementById('section-jobs');
    section.style.display = 'block';

    const jobs = data.jobs || data.matches || [];
    const grid = document.getElementById('jobs-grid');
    const countEl = document.getElementById('jobs-count');
    grid.innerHTML = '';
    countEl.textContent = jobs.length;

    if (jobs.length === 0) {
        grid.innerHTML = `
            <div class="jobs-empty">
                <p>No matching jobs found right now. Try updating your CV or check back later!</p>
            </div>`;
        return;
    }

    jobs.forEach((job, index) => {
        grid.appendChild(createJobCard(job, index));
    });
}

/**
 * Creates a single job match card element.
 * @param {Object} job — Job data (title, company, match_score, skill_gaps, url, recommendations)
 * @param {number} index — Card index (used for unique IDs)
 * @returns {HTMLElement} The job card DOM element
 */
function createJobCard(job, index) {
    const card = document.createElement('div');
    card.className = 'job-card';
    card.id = `job-card-${index}`;

    // ── Match score color ──
    const score = job.match_score || job.score || 0;
    let scoreClass;
    if (score <= 40) scoreClass = 'score-low';
    else if (score <= 70) scoreClass = 'score-medium';
    else scoreClass = 'score-high';

    // ── Skill gaps list ──
    const gaps = job.skill_gaps || job.missing_skills || [];
    const gapsHTML = gaps.length > 0
        ? `<ul class="skill-gaps-list">${gaps.map(g => `<li>${escapeHTML(g)}</li>`).join('')}</ul>`
        : '<p class="no-gaps">No skill gaps — you\'re a great fit!</p>';

    // ── Recommendations (expandable) ──
    const recs = job.recommendations || job.how_to_close_gaps || [];
    const recsHTML = recs.length > 0
        ? `<ul class="recs-list">${recs.map(r => `<li>${escapeHTML(r)}</li>`).join('')}</ul>`
        : '<p>Keep building your current skills and gaining experience.</p>';

    card.innerHTML = `
        <div class="job-card-header">
            <div class="job-info">
                <h3 class="job-title">${escapeHTML(job.title || 'Untitled Position')}</h3>
                <p class="job-company">${escapeHTML(job.company || 'Company not specified')}</p>
            </div>
            <div class="match-score-container">
                <div class="match-score-header">
                    <span class="match-score-label">Match Score</span>
                    <span class="match-score-value ${scoreClass}">${score}%</span>
                </div>
                <div class="match-progress-bar-bg">
                    <div class="match-progress-bar-fill ${scoreClass}" style="width: ${score}%;"></div>
                </div>
            </div>
        </div>

        <div class="job-card-body">
            <div class="skill-gaps-section">
                <h4 class="job-card-subtitle">Skill Gaps</h4>
                ${gapsHTML}
            </div>

            <details class="gaps-details" id="gaps-details-${index}">
                <summary class="gaps-summary">How to Close Gaps</summary>
                <div class="gaps-recommendations">${recsHTML}</div>
            </details>
        </div>

        <div class="job-card-footer">
            <a href="${escapeHTML(job.url || job.link || '#')}" target="_blank" rel="noopener noreferrer"
               class="btn btn-primary btn-sm">
                View Job →
            </a>
        </div>
    `;

    return card;
}


// ============================================================
// OPTIMIZED CV ACTIONS — DOWNLOAD & COPY
// ============================================================

/**
 * Sets up click handlers for Download as PDF and Copy to Clipboard buttons.
 */
function setupOptimizedActions() {
    document.getElementById('btn-download-txt').addEventListener('click', () => {
        if (!optimizedCvText) {
            showToast('No optimized CV to download.', 'warning');
            return;
        }
        downloadCVasPDF();
        showToast('Download started!', 'success');
    });

    document.getElementById('btn-copy-clipboard').addEventListener('click', async () => {
        if (!optimizedCvText) {
            showToast('No optimized CV to copy.', 'warning');
            return;
        }
        copyToClipboard(optimizedCvText);
    });
}

/**
 * Generates and downloads a PDF using html2pdf.js
 */
function downloadCVasPDF() {
  const element = document.getElementById('cv-preview-container');
  const options = {
    margin: [15, 15, 15, 15],
    filename: 'Optimized_CV.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(options).from(element).save();
}

/**
 * Copies text to the clipboard and shows a success toast.
 * Falls back to a manual textarea copy for older browsers.
 * @param {string} text - The text to copy
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for browsers that don't support navigator.clipboard
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard!', 'success');
    }
}


// ============================================================
// LOADING OVERLAY
// ============================================================

/**
 * Shows the full-page loading overlay with a custom status message.
 * @param {string} message — The status text to display
 */
function showLoading(message) {
    const overlay = document.getElementById('loading-overlay');
    const textEl = document.getElementById('loading-text');
    overlay.style.display = 'flex';
    textEl.textContent = message || 'Processing...';
}

/**
 * Hides the full-page loading overlay.
 */
function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}


// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

/**
 * Displays a small, auto-dismissing notification in the top-right corner.
 * @param {string} message — The notification message
 * @param {'success'|'error'|'warning'|'info'} type — Visual style of the toast
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');

    // Choose icon based on type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${escapeHTML(message)}</span>
        <button class="toast-close" aria-label="Dismiss">✕</button>
    `;

    // Dismiss on close button click
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    // Trigger entry animation on next frame
    requestAnimationFrame(() => toast.classList.add('toast-enter'));

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}


// ============================================================
// ACCOUNT DROPDOWN
// ============================================================

/**
 * Sets up the account dropdown toggle and sign-out button.
 * Also closes the dropdown when clicking anywhere else on the page.
 */
function setupDropdown() {
    const toggle = document.getElementById('account-toggle');
    const dropdown = document.getElementById('account-dropdown');
    const signOutBtn = document.getElementById('btn-sign-out');
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks = document.getElementById('nav-links');

    // Toggle dropdown visibility
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });

    // Sign out
    signOutBtn.addEventListener('click', async () => {
        showLoading('Signing out...');
        await signOut();
    });

    // Mobile hamburger menu toggle
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('nav-open');
        hamburger.classList.toggle('active');
    });
}


// ============================================================
// UTILITY: HTML ESCAPING
// ============================================================

/**
 * Escapes HTML special characters to prevent XSS when
 * inserting user-generated or API-returned text into the DOM.
 * @param {string} str — The raw string to escape
 * @returns {string} The escaped string safe for innerHTML
 */
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
