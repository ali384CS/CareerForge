/**
 * ============================================
 * CV OPTIMIZER — SUPABASE CLIENT
 * ============================================
 * 
 * This file initializes the Supabase client that all pages use to:
 * - Authenticate users (signup, login, OAuth)
 * - Read/write data from the database
 * - Upload files to Supabase Storage
 * - Call Edge Functions
 * 
 * The Supabase client automatically handles:
 * - Storing the user session in localStorage
 * - Refreshing expired JWT tokens
 * - Attaching the auth token to all requests
 * 
 * PREREQUISITE: config.js must be loaded before this file
 */

// Initialize the Supabase client using credentials from config.js
// supabase-js is loaded via CDN in each HTML file
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Get the currently logged-in user's session
 * @returns {Promise<Object|null>} The session object, or null if not logged in
 */
async function getSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) {
        console.error('Error getting session:', error.message);
        return null;
    }
    return session;
}

/**
 * Get the currently logged-in user's data
 * @returns {Promise<Object|null>} The user object, or null if not logged in
 */
async function getCurrentUser() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error) {
        console.error('Error getting user:', error.message);
        return null;
    }
    return user;
}

/**
 * Sign up a new user with email and password
 * @param {string} email - The user's email address
 * @param {string} password - The user's chosen password
 * @param {string} fullName - The user's full name
 * @returns {Promise<Object>} Result with data or error
 */
async function signUpWithEmail(email, password, fullName) {
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: fullName
            }
        }
    });
    return { data, error };
}

/**
 * Log in an existing user with email and password
 * @param {string} email - The user's email address
 * @param {string} password - The user's password
 * @returns {Promise<Object>} Result with data or error
 */
async function signInWithEmail(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    return { data, error };
}

/**
 * Log in with Google OAuth
 * Redirects the user to Google's login page, then back to the dashboard
 * @returns {Promise<Object>} Result with data or error
 */
async function signInWithGoogle() {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/dashboard.html`
        }
    });
    return { data, error };
}

/**
 * Log out the current user
 * Clears the session from localStorage and redirects to the auth page
 */
async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('Error signing out:', error.message);
    }
    window.location.href = '/auth.html';
}

/**
 * Check if user is authenticated — if not, redirect to auth page
 * Use this at the top of protected pages (dashboard, history)
 */
async function requireAuth() {
    const session = await getSession();
    if (!session) {
        window.location.href = '/auth.html';
        return null;
    }
    return session;
}

/**
 * Call a Supabase Edge Function with authentication
 * @param {string} functionName - Name of the Edge Function (e.g., 'analyze-cv')
 * @param {Object} body - The JSON body to send
 * @returns {Promise<Object>} The response data or error
 */
async function callEdgeFunction(functionName, body) {
    const session = await getSession();
    if (!session) {
        return { data: null, error: { message: 'Not authenticated' } };
    }

    try {
        const { data, error } = await supabaseClient.functions.invoke(functionName, {
            body: body
        });

        if (error) {
            let errorMsg = error.message || 'Edge Function error';
            
            // Supabase JS puts the raw Response in error.context for non-2xx errors
            if (error.context && typeof error.context.json === 'function') {
                try {
                    const errorJson = await error.context.json();
                    if (errorJson.error) {
                        errorMsg = errorJson.error;
                    }
                } catch (e) {
                    console.error("Failed to parse Edge Function error context", e);
                }
            } else if (error.context && error.context.error) {
                // Sometimes it's already parsed
                errorMsg = error.context.error;
            }

            return { data: null, error: { message: errorMsg } };
        }

        return { data, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message || 'Network error' } };
    }
}

/**
 * Upload a file to Supabase Storage
 * @param {File} file - The file object to upload
 * @param {string} userId - The user's ID (used to namespace the file)
 * @returns {Promise<Object>} Result with the file URL or error
 */
async function uploadCV(file, userId) {
    // Create a unique filename using timestamp + original name
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}_${file.name}`;

    const { data, error } = await supabaseClient.storage
        .from('cv-uploads')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        return { url: null, error };
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabaseClient.storage
        .from('cv-uploads')
        .getPublicUrl(data.path);

    return { url: urlData.publicUrl, path: data.path, error: null };
}
