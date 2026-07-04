/**
 * ============================================
 * CV OPTIMIZER — HISTORY PAGE LOGIC
 * ============================================
 *
 * This file powers the History page where users can:
 *  1. View all their past CV uploads in a sortable table
 *  2. Filter by date range
 *  3. Sort by date or ATS score
 *  4. View past analysis results, optimized CVs, and job matches in a modal
 *  5. Delete CV records and associated data
 *  6. Navigate paginated results
 *
 * DEPENDENCIES (loaded before this script in history.html):
 *  - supabase-js (CDN) — Supabase client SDK
 *  - config.js — SUPABASE_URL, SUPABASE_ANON_KEY
 *  - supabase-client.js — getSession, getCurrentUser, signOut,
 *    requireAuth, callEdgeFunction, uploadCV
 */

// ============================================================
// GLOBAL STATE
// ============================================================

/** @type {Array} All CV records fetched from Supabase */
let allCvRecords = [];

/** @type {Array} Filtered/sorted subset currently displayed */
let displayedRecords = [];

/** @type {number} Current page index (0-based) */
let currentPage = 0;

/** @type {number} Number of rows shown per page */
const PAGE_SIZE = 10;


// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Entry point — runs when the DOM is fully loaded.
 * 1. Checks authentication (redirects to auth.html if not logged in)
 * 2. Loads user info into the nav dropdown
 * 3. Fetches CV history from Supabase
 * 4. Sets up event listeners for filters, sort, and pagination
 */
document.addEventListener('DOMContentLoaded', async () => {
    // ── Auth guard ──
    const session = await requireAuth();
    if (!session) return;

    // ── Load user info into nav ──
    await loadUserInfo();

    // ── Set up interactive listeners ──
    setupDropdown();
    setupFilters();
    setupPagination();

    // ── Fetch and display CV history ──
    await loadCvHistory();
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
            document.getElementById('account-email').textContent =
                email.length > 24 ? email.slice(0, 22) + '…' : email;
            document.getElementById('dropdown-email').textContent = email;
        }
    } catch (err) {
        console.error('Failed to load user info:', err);
    }
}


// ============================================================
// LOAD CV HISTORY FROM SUPABASE
// ============================================================

/**
 * Fetches all CV records for the current user from the 'cvs' table,
 * ordered by creation date (newest first).
 * Then renders them into the history table.
 */
async function loadCvHistory() {
    const loadingEl = document.getElementById('history-loading');
    const emptyEl = document.getElementById('history-empty');
    const tableWrapper = document.getElementById('history-table-wrapper');

    // Show loading spinner
    loadingEl.style.display = 'flex';
    emptyEl.style.display = 'none';
    tableWrapper.style.display = 'none';

    try {
        const { data, error } = await supabaseClient
            .from('cvs')
            .select('*')
            .order('created_at', { ascending: false });

        loadingEl.style.display = 'none';

        if (error) {
            showToast('Failed to load history: ' + error.message, 'error');
            console.error('History fetch error:', error);
            return;
        }

        allCvRecords = data || [];

        if (allCvRecords.length === 0) {
            // ── Empty state ──
            emptyEl.style.display = 'flex';
        } else {
            // ── Populate table ──
            displayedRecords = [...allCvRecords];
            currentPage = 0;
            renderTable();
            tableWrapper.style.display = 'block';
        }

    } catch (err) {
        loadingEl.style.display = 'none';
        showToast('An unexpected error occurred while loading history.', 'error');
        console.error('History load error:', err);
    }
}


// ============================================================
// RENDER TABLE
// ============================================================

/**
 * Renders the current page of displayedRecords into the history table.
 * Each row shows: Date, File Name, ATS Score (badge), Actions.
 */
function renderTable() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    // Calculate pagination slice
    const start = currentPage * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, displayedRecords.length);
    const pageRecords = displayedRecords.slice(start, end);

    pageRecords.forEach((record) => {
        const tr = document.createElement('tr');
        tr.id = `cv-row-${record.id}`;

        // ── Date column ──
        const tdDate = document.createElement('td');
        tdDate.className = 'td-date';
        tdDate.textContent = formatDate(record.created_at);

        // ── File name column ──
        const tdName = document.createElement('td');
        tdName.className = 'td-filename';
        tdName.textContent = record.file_name || record.cv_path?.split('/').pop() || 'Unknown';

        // ── ATS Score column with colored badge ──
        const tdScore = document.createElement('td');
        tdScore.className = 'td-score';
        const score = record.ats_score ?? record.score ?? null;
        if (score !== null) {
            const badge = document.createElement('span');
            badge.className = `score-badge ${getScoreClass(score)}`;
            badge.textContent = score;
            tdScore.appendChild(badge);
        } else {
            tdScore.textContent = '—';
        }

        // ── Actions column ──
        const tdActions = document.createElement('td');
        tdActions.className = 'td-actions';
        tdActions.innerHTML = `
            <div class="action-btn-group">
                <button class="btn btn-ghost btn-xs" onclick="viewAnalysis('${record.id}')" title="View Analysis">
                    📊 Analysis
                </button>
                <button class="btn btn-ghost btn-xs" onclick="viewOptimized('${record.id}')" title="View Optimized CV">
                    ✨ Optimized
                </button>
                <button class="btn btn-ghost btn-xs" onclick="viewJobs('${record.id}')" title="View Matched Jobs">
                    💼 Jobs
                </button>
                <button class="btn btn-danger btn-xs" onclick="deleteCv('${record.id}')" title="Delete this CV">
                    🗑️ Delete
                </button>
            </div>
        `;

        tr.appendChild(tdDate);
        tr.appendChild(tdName);
        tr.appendChild(tdScore);
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });

    updatePagination();
}


// ============================================================
// PAGINATION
// ============================================================

/**
 * Sets up click listeners for the Previous and Next page buttons.
 */
function setupPagination() {
    document.getElementById('btn-prev-page').addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            renderTable();
        }
    });

    document.getElementById('btn-next-page').addEventListener('click', () => {
        const maxPage = Math.ceil(displayedRecords.length / PAGE_SIZE) - 1;
        if (currentPage < maxPage) {
            currentPage++;
            renderTable();
        }
    });
}

/**
 * Updates the pagination info text and enables/disables
 * the Previous/Next buttons based on the current page.
 */
function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(displayedRecords.length / PAGE_SIZE));
    const infoEl = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');

    infoEl.textContent = `Page ${currentPage + 1} of ${totalPages}`;
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalPages - 1;
}


// ============================================================
// FILTERS & SORTING
// ============================================================

/**
 * Sets up event listeners for the filter and sort controls.
 */
function setupFilters() {
    document.getElementById('btn-apply-filters').addEventListener('click', applyFilters);
    document.getElementById('btn-clear-filters').addEventListener('click', clearFilters);
}

/**
 * Applies date range filters and sort order to allCvRecords,
 * updates displayedRecords, then re-renders the table.
 */
function applyFilters() {
    const fromDate = document.getElementById('filter-date-from').value;
    const toDate = document.getElementById('filter-date-to').value;
    const sortBy = document.getElementById('sort-select').value;

    // ── Filter by date range ──
    let filtered = [...allCvRecords];

    if (fromDate) {
        const from = new Date(fromDate);
        filtered = filtered.filter(r => new Date(r.created_at) >= from);
    }

    if (toDate) {
        const to = new Date(toDate);
        // Include the entire "to" day by setting time to end of day
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter(r => new Date(r.created_at) <= to);
    }

    // ── Sort ──
    filtered = sortRecords(filtered, sortBy);

    // ── Update state and re-render ──
    displayedRecords = filtered;
    currentPage = 0;

    const emptyEl = document.getElementById('history-empty');
    const tableWrapper = document.getElementById('history-table-wrapper');

    if (displayedRecords.length === 0) {
        tableWrapper.style.display = 'none';
        emptyEl.style.display = 'flex';
    } else {
        emptyEl.style.display = 'none';
        tableWrapper.style.display = 'block';
        renderTable();
    }
}

/**
 * Clears all filters and resets to showing all records (newest first).
 */
function clearFilters() {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    document.getElementById('sort-select').value = 'date-desc';

    displayedRecords = [...allCvRecords];
    currentPage = 0;

    const emptyEl = document.getElementById('history-empty');
    const tableWrapper = document.getElementById('history-table-wrapper');

    if (displayedRecords.length === 0) {
        tableWrapper.style.display = 'none';
        emptyEl.style.display = 'flex';
    } else {
        emptyEl.style.display = 'none';
        tableWrapper.style.display = 'block';
        renderTable();
    }
}

/**
 * Sorts an array of CV records by the selected criterion.
 * @param {Array} records — Array of CV record objects
 * @param {string} sortBy — Sort key: 'date-desc', 'date-asc', 'score-desc', 'score-asc'
 * @returns {Array} Sorted array (new array, does not mutate input)
 */
function sortRecords(records, sortBy) {
    const sorted = [...records];

    switch (sortBy) {
        case 'date-desc':
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'date-asc':
            sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'score-desc':
            sorted.sort((a, b) => (b.ats_score || 0) - (a.ats_score || 0));
            break;
        case 'score-asc':
            sorted.sort((a, b) => (a.ats_score || 0) - (b.ats_score || 0));
            break;
    }

    return sorted;
}


// ============================================================
// VIEW ANALYSIS (Modal)
// ============================================================

/**
 * Opens a modal showing the full analysis details for a specific CV.
 * Fetches data from the 'cvs' table (or associated analysis table).
 * @param {string} cvId — The CV record ID
 */
async function viewAnalysis(cvId) {
    openModal('Loading Analysis...');
    setModalBody('<div class="modal-loading"><div class="loading-spinner"><svg class="spinner-svg" viewBox="0 0 50 50"><circle class="spinner-circle" cx="25" cy="25" r="20" fill="none" stroke-width="4"/></svg></div></div>');

    try {
        // Fetch the CV record which contains analysis data
        const { data, error } = await supabaseClient
            .from('cvs')
            .select('*')
            .eq('id', cvId)
            .single();

        if (error || !data) {
            setModalBody('<p class="modal-error">Could not load analysis data. It may have been deleted.</p>');
            return;
        }

        const score = data.ats_score ?? data.score ?? null;
        const feedback = data.feedback || data.overall_feedback || 'No feedback available.';
        const keywordsFound = data.keywords_found || [];
        const keywordsMissing = data.keywords_missing || [];
        const suggestions = data.suggestions || [];

        // Build the modal content
        let html = '<div class="modal-analysis">';

        // ATS Score
        if (score !== null) {
            html += `
                <div class="modal-score-row">
                    <span class="modal-score-label">ATS Score:</span>
                    <span class="score-badge ${getScoreClass(score)} score-badge-lg">${score}</span>
                </div>`;
        }

        // Feedback
        html += `<div class="modal-section">
            <h4>📋 Feedback</h4>
            <p>${escapeHTML(feedback)}</p>
        </div>`;

        // Keywords Found
        if (keywordsFound.length > 0) {
            html += `<div class="modal-section">
                <h4>✅ Keywords Found</h4>
                <div class="keywords-grid">
                    ${keywordsFound.map(k => `<span class="keyword-chip keyword-found">${escapeHTML(k)}</span>`).join('')}
                </div>
            </div>`;
        }

        // Keywords Missing
        if (keywordsMissing.length > 0) {
            html += `<div class="modal-section">
                <h4>⚠️ Keywords Missing</h4>
                <div class="keywords-grid">
                    ${keywordsMissing.map(k => `<span class="keyword-chip keyword-missing">${escapeHTML(k)}</span>`).join('')}
                </div>
            </div>`;
        }

        // Suggestions
        if (suggestions.length > 0) {
            html += `<div class="modal-section">
                <h4>💡 Suggestions</h4>
                <ol class="modal-suggestions-list">
                    ${suggestions.map(s => `<li>${escapeHTML(s)}</li>`).join('')}
                </ol>
            </div>`;
        }

        html += '</div>';
        setModalTitle('Analysis Results');
        setModalBody(html);

    } catch (err) {
        setModalBody('<p class="modal-error">An unexpected error occurred.</p>');
        console.error('View analysis error:', err);
    }
}


// ============================================================
// VIEW OPTIMIZED CV (Modal)
// ============================================================

/**
 * Opens a modal showing the optimized CV text for a specific CV.
 * Fetches from the 'optimized_cvs' table.
 * @param {string} cvId — The CV record ID
 */
async function viewOptimized(cvId) {
    openModal('Loading Optimized CV...');
    setModalBody('<div class="modal-loading"><div class="loading-spinner"><svg class="spinner-svg" viewBox="0 0 50 50"><circle class="spinner-circle" cx="25" cy="25" r="20" fill="none" stroke-width="4"/></svg></div></div>');

    try {
        const { data, error } = await supabaseClient
            .from('optimized_cvs')
            .select('*')
            .eq('cv_id', cvId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            setModalBody('<p class="modal-error">No optimized CV found for this record. Try running the optimizer from the Dashboard.</p>');
            return;
        }

        const optimizedText = data.optimized_text || data.content || '';
        const changes = data.changes || data.changes_made || [];

        let html = '<div class="modal-optimized">';

        // Changes made
        if (changes.length > 0) {
            html += `<div class="modal-section">
                <h4>📝 Changes Made</h4>
                <ul class="modal-changes-list">
                    ${changes.map(c => `<li>${escapeHTML(c)}</li>`).join('')}
                </ul>
            </div>`;
        }

        // Optimized text preview
        html += `<div class="modal-section">
            <h4>Preview</h4>
            <div class="cv-preview modal-cv-preview">${escapeHTML(optimizedText)}</div>
        </div>`;

        html += '</div>';

        setModalTitle('Optimized CV');
        setModalBody(html);

    } catch (err) {
        setModalBody('<p class="modal-error">An unexpected error occurred.</p>');
        console.error('View optimized error:', err);
    }
}


// ============================================================
// VIEW JOB MATCHES (Modal)
// ============================================================

/**
 * Opens a modal showing matched jobs for a specific CV.
 * Fetches from the 'job_matches' table.
 * @param {string} cvId — The CV record ID
 */
async function viewJobs(cvId) {
    openModal('Loading Job Matches...');
    setModalBody('<div class="modal-loading"><div class="loading-spinner"><svg class="spinner-svg" viewBox="0 0 50 50"><circle class="spinner-circle" cx="25" cy="25" r="20" fill="none" stroke-width="4"/></svg></div></div>');

    try {
        const { data, error } = await supabaseClient
            .from('job_matches')
            .select('*')
            .eq('cv_id', cvId)
            .order('match_score', { ascending: false });

        if (error || !data || data.length === 0) {
            setModalBody('<p class="modal-error">No job matches found for this CV. Try running job matching from the Dashboard.</p>');
            return;
        }

        let html = '<div class="modal-jobs">';

        data.forEach((job, i) => {
            const score = job.match_score || job.score || 0;
            const gaps = job.skill_gaps || job.missing_skills || [];
            const recs = job.recommendations || [];

            html += `
                <div class="modal-job-card">
                    <div class="modal-job-header">
                        <div>
                            <h4 class="modal-job-title">${escapeHTML(job.title || 'Untitled Position')}</h4>
                            <p class="modal-job-company">${escapeHTML(job.company || 'N/A')}</p>
                        </div>
                        <span class="score-badge ${getScoreClass(score)}">${score}</span>
                    </div>
                    ${gaps.length > 0 ? `
                        <div class="modal-job-gaps">
                            <strong>Skill Gaps:</strong>
                            <ul>${gaps.map(g => `<li>${escapeHTML(g)}</li>`).join('')}</ul>
                        </div>` : ''}
                    ${job.url || job.link ? `
                        <a href="${escapeHTML(job.url || job.link)}" target="_blank" rel="noopener noreferrer"
                           class="btn btn-primary btn-xs">View Job →</a>` : ''}
                </div>`;
        });

        html += '</div>';

        setModalTitle(`Job Matches (${data.length})`);
        setModalBody(html);

    } catch (err) {
        setModalBody('<p class="modal-error">An unexpected error occurred.</p>');
        console.error('View jobs error:', err);
    }
}


// ============================================================
// DELETE CV
// ============================================================

/**
 * Deletes a CV record and all associated data (optimized CVs, job matches)
 * after confirming with the user.
 * @param {string} cvId — The CV record ID to delete
 */
async function deleteCv(cvId) {
    // Confirm before deleting
    const confirmed = confirm('Are you sure you want to delete this CV and all its associated analysis, optimized versions, and job matches? This cannot be undone.');
    if (!confirmed) return;

    try {
        // Delete associated job matches first
        await supabaseClient.from('job_matches').delete().eq('cv_id', cvId);

        // Delete associated optimized CVs
        await supabaseClient.from('optimized_cvs').delete().eq('cv_id', cvId);

        // Delete the CV record itself
        const { error } = await supabaseClient.from('cvs').delete().eq('id', cvId);

        if (error) {
            showToast('Failed to delete CV: ' + error.message, 'error');
            return;
        }

        showToast('CV deleted successfully.', 'success');

        // Remove from local state and re-render
        allCvRecords = allCvRecords.filter(r => r.id !== cvId);
        displayedRecords = displayedRecords.filter(r => r.id !== cvId);

        if (displayedRecords.length === 0) {
            document.getElementById('history-table-wrapper').style.display = 'none';
            document.getElementById('history-empty').style.display = 'flex';
        } else {
            // Adjust current page if we deleted the last item on the page
            const maxPage = Math.ceil(displayedRecords.length / PAGE_SIZE) - 1;
            if (currentPage > maxPage) currentPage = maxPage;
            renderTable();
        }

    } catch (err) {
        showToast('An unexpected error occurred while deleting.', 'error');
        console.error('Delete CV error:', err);
    }
}


// ============================================================
// MODAL COMPONENT
// ============================================================

/**
 * Opens the detail modal with a given title.
 * @param {string} title — The modal title text
 */
function openModal(title) {
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const closeBtn = document.getElementById('modal-close');

    modalTitle.textContent = title || 'Details';
    overlay.style.display = 'flex';

    // Prevent body scrolling while modal is open
    document.body.style.overflow = 'hidden';

    // Close handlers
    closeBtn.onclick = closeModal;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Close on Escape key
    document.addEventListener('keydown', handleModalEscape);
}

/**
 * Closes the detail modal and restores body scrolling.
 */
function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleModalEscape);
}

/**
 * Handles the Escape key to close the modal.
 * @param {KeyboardEvent} e
 */
function handleModalEscape(e) {
    if (e.key === 'Escape') closeModal();
}

/**
 * Sets the modal title text.
 * @param {string} title
 */
function setModalTitle(title) {
    document.getElementById('modal-title').textContent = title;
}

/**
 * Sets the modal body HTML content.
 * @param {string} html — Inner HTML for the modal body
 */
function setModalBody(html) {
    document.getElementById('modal-body').innerHTML = html;
}


// ============================================================
// ACCOUNT DROPDOWN
// ============================================================

/**
 * Sets up the account dropdown toggle and sign-out button.
 */
function setupDropdown() {
    const toggle = document.getElementById('account-toggle');
    const dropdown = document.getElementById('account-dropdown');
    const signOutBtn = document.getElementById('btn-sign-out');
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks = document.getElementById('nav-links');

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });

    signOutBtn.addEventListener('click', async () => {
        await signOut();
    });

    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('nav-open');
        hamburger.classList.toggle('active');
    });
}


// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

/**
 * Displays a small, auto-dismissing notification.
 * @param {string} message — The notification message
 * @param {'success'|'error'|'warning'|'info'} type — Visual style
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${escapeHTML(message)}</span>
        <button class="toast-close" aria-label="Dismiss">✕</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-enter'));

    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}


// ============================================================
// UTILITY HELPERS
// ============================================================

/**
 * Formats an ISO date string into a human-readable format.
 * @param {string} isoDate — ISO 8601 date string from Supabase
 * @returns {string} Formatted date, e.g. "Jul 1, 2026, 3:45 PM"
 */
function formatDate(isoDate) {
    if (!isoDate) return '—';
    try {
        return new Date(isoDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    } catch {
        return isoDate;
    }
}

/**
 * Returns a CSS class name based on the ATS score range.
 * @param {number} score — ATS score (0–100)
 * @returns {string} CSS class: 'score-low', 'score-medium', or 'score-high'
 */
function getScoreClass(score) {
    if (score <= 40) return 'score-low';
    if (score <= 70) return 'score-medium';
    return 'score-high';
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str — Raw string to escape
 * @returns {string} Escaped string safe for innerHTML
 */
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
