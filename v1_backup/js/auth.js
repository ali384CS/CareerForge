/* ============================================================
   auth.js — Authentication Page Logic
   Handles login / signup forms, validation, Supabase auth calls,
   password strength indicator, show/hide toggle, and toasts.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ----------------------------------------------------------
     0. REDIRECT IF ALREADY LOGGED IN
     If a valid session exists, send the user to the dashboard
     immediately so they don't see the auth page.
     ---------------------------------------------------------- */
  (async () => {
    try {
      if (typeof getCurrentUser === 'function') {
        const user = await getCurrentUser();
        if (user) {
          window.location.replace('dashboard.html');
          return;
        }
      }
    } catch (_) {
      // Supabase not configured yet — that's fine, stay on auth
    }
  })();

  /* ----------------------------------------------------------
     DOM REFERENCES
     ---------------------------------------------------------- */
  // Tabs
  const tabLogin  = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');

  // Panels
  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  // Header text (changes with tab)
  const authTitle    = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');

  // Messages
  const errorBox   = document.getElementById('auth-error');
  const successBox  = document.getElementById('auth-success');

  // Login fields
  const loginEmail     = document.getElementById('login-email');
  const loginPassword  = document.getElementById('login-password');
  const loginSubmit    = document.getElementById('login-submit');
  const loginTogglePw  = document.getElementById('login-toggle-pw');
  const loginGoogleBtn = document.getElementById('login-google-btn');

  // Signup fields
  const signupName      = document.getElementById('signup-name');
  const signupEmail     = document.getElementById('signup-email');
  const signupPassword  = document.getElementById('signup-password');
  const signupConfirm   = document.getElementById('signup-confirm');
  const signupSubmit    = document.getElementById('signup-submit');
  const signupTogglePw  = document.getElementById('signup-toggle-pw');
  const signupGoogleBtn = document.getElementById('signup-google-btn');

  // Password strength
  const strengthBar   = document.getElementById('password-strength-bar');
  const strengthLabel = document.getElementById('password-strength-label');

  /* ----------------------------------------------------------
     1. TAB SWITCHING
     Toggle between Login and Sign Up panels with animation.
     ---------------------------------------------------------- */
  function switchTab(tab) {
    // Clear any messages when switching
    hideMessages();

    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      loginForm.classList.add('active');
      signupForm.classList.remove('active');
      authTitle.textContent = 'Welcome Back';
      authSubtitle.textContent = 'Sign in to continue optimizing your CV';
    } else {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      signupForm.classList.add('active');
      loginForm.classList.remove('active');
      authTitle.textContent = 'Create Account';
      authSubtitle.textContent = 'Start your job search journey today';
    }
  }

  tabLogin.addEventListener('click',  () => switchTab('login'));
  tabSignup.addEventListener('click', () => switchTab('signup'));

  /* ----------------------------------------------------------
     2. MESSAGE HELPERS
     Show / hide the error and success boxes.
     ---------------------------------------------------------- */
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('error');
    errorBox.style.display = 'block';
    successBox.style.display = 'none';
  }

  function showSuccess(msg) {
    successBox.textContent = msg;
    successBox.classList.add('success');
    successBox.style.display = 'block';
    errorBox.style.display = 'none';
  }

  function hideMessages() {
    errorBox.style.display   = 'none';
    successBox.style.display = 'none';
    errorBox.classList.remove('error');
    successBox.classList.remove('success');
  }

  /* ----------------------------------------------------------
     3. LOADING STATE HELPERS
     Show a spinner inside the submit button and disable it.
     ---------------------------------------------------------- */
  function setLoading(button, isLoading) {
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.innerHTML = '<span class="spinner"></span>';
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || 'Submit';
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  /* ----------------------------------------------------------
     4. VALIDATION HELPERS
     ---------------------------------------------------------- */
  /** Simple email regex check */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /** Evaluate password strength: weak / medium / strong */
  function evaluateStrength(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return 'weak';
    if (score <= 3) return 'medium';
    return 'strong';
  }

  /* ----------------------------------------------------------
     5. PASSWORD STRENGTH INDICATOR (Signup only)
     Updates the coloured bar and label as the user types.
     ---------------------------------------------------------- */
  if (signupPassword) {
    signupPassword.addEventListener('input', () => {
      const val = signupPassword.value;
      if (!val) {
        strengthBar.className = 'password-strength__bar';
        strengthLabel.textContent = '';
        return;
      }

      const level = evaluateStrength(val);
      strengthBar.className = 'password-strength__bar ' + level;

      const labels = { weak: 'Weak', medium: 'Medium', strong: 'Strong' };
      strengthLabel.textContent = 'Strength: ' + labels[level];
    });
  }

  /* ----------------------------------------------------------
     6. SHOW / HIDE PASSWORD TOGGLE
     Swaps input type between "password" and "text".
     ---------------------------------------------------------- */
  function bindToggle(toggleBtn, inputEl) {
    if (!toggleBtn || !inputEl) return;
    toggleBtn.addEventListener('click', () => {
      const isHidden = inputEl.type === 'password';
      inputEl.type = isHidden ? 'text' : 'password';
      toggleBtn.textContent = isHidden ? '🙈' : '👁';
      toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
  }

  bindToggle(loginTogglePw, loginPassword);
  bindToggle(signupTogglePw, signupPassword);

  /* ----------------------------------------------------------
     7. LOGIN FORM HANDLER
     Validates fields, shows spinner, calls Supabase sign-in.
     ---------------------------------------------------------- */
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    // --- Validation ---
    if (!email || !password) {
      showError('Please fill in all fields.');
      return;
    }
    if (!isValidEmail(email)) {
      showError('Please enter a valid email address.');
      return;
    }

    // --- Attempt sign-in ---
    setLoading(loginSubmit, true);

    try {
      if (typeof signInWithEmail === 'function') {
        const { data, error } = await signInWithEmail(email, password);
        if (error) throw error;
        // Success — redirect to dashboard
        window.location.href = 'dashboard.html';
      } else {
        // Supabase client not available — show helpful message
        showError('Authentication service is not configured yet. Please set up config.js.');
      }
    } catch (err) {
      showError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(loginSubmit, false);
    }
  });

  /* ----------------------------------------------------------
     8. SIGNUP FORM HANDLER
     Validates all fields (name, email, password match &
     strength), shows spinner, calls Supabase sign-up.
     ---------------------------------------------------------- */
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const name     = signupName.value.trim();
    const email    = signupEmail.value.trim();
    const password = signupPassword.value;
    const confirm  = signupConfirm.value;

    // --- Validation ---
    if (!name) {
      showError('Please enter your full name.');
      return;
    }
    if (!email || !isValidEmail(email)) {
      showError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      showError('Passwords do not match.');
      return;
    }

    // --- Attempt sign-up ---
    setLoading(signupSubmit, true);

    try {
      if (typeof signUpWithEmail === 'function') {
        const { data, error } = await signUpWithEmail(email, password, name);
        if (error) throw error;
        showSuccess('Account created! Check your email for a confirmation link.');
        showToast('Check your inbox to verify your email.', 'success');
      } else {
        showError('Authentication service is not configured yet. Please set up config.js.');
      }
    } catch (err) {
      showError(err.message || 'Sign-up failed. Please try again.');
    } finally {
      setLoading(signupSubmit, false);
    }
  });

  /* ----------------------------------------------------------
     9. GOOGLE OAUTH HANDLER
     Both login and signup Google buttons trigger the same flow.
     ---------------------------------------------------------- */
  function handleGoogleAuth() {
    hideMessages();
    try {
      if (typeof signInWithGoogle === 'function') {
        signInWithGoogle(); // Supabase redirects to Google
      } else {
        showError('Google authentication is not configured yet.');
      }
    } catch (err) {
      showError(err.message || 'Google sign-in failed.');
    }
  }

  if (loginGoogleBtn)  loginGoogleBtn.addEventListener('click', handleGoogleAuth);
  if (signupGoogleBtn) signupGoogleBtn.addEventListener('click', handleGoogleAuth);

  /* ----------------------------------------------------------
     10. TOAST NOTIFICATION HELPER
     Creates a small notification that auto-dismisses.
     ---------------------------------------------------------- */
  window.showToast = function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Build toast element
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
  };

});
