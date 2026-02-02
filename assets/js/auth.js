import { supabase, state, showToast } from './config.js';

// =============================================================================
// 1. DOM ELEMENTS (Safe selection)
// =============================================================================
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const btnShowSignup = document.getElementById('btn-show-signup');
const btnShowLogin = document.getElementById('btn-show-login');
const logoutBtn = document.getElementById('btn-logout'); // In app.html sidebar
const logoutBtnHeader = document.getElementById('logout-btn'); // In app.html header (if any)

// =============================================================================
// 2. AUTHENTICATION LOGIC
// =============================================================================

/**
 * Handle User Login
 */
async function handleLogin(e) {
    e.preventDefault();
    setLoading('login', true);

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    setLoading('login', false);

    if (error) {
        showAlert(error.message, 'error');
    } else {
        // Successful login
        window.location.href = '/app.html';
    }
}

/**
 * Handle User Signup
 */
async function handleSignup(e) {
    e.preventDefault();
    setLoading('signup', true);

    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const fullName = document.getElementById('signup-name').value;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName } // Passed to 'profiles' table via Trigger
        }
    });

    setLoading('signup', false);

    if (error) {
        showAlert(error.message, 'error');
    } else {
        showAlert('Account created! Logging you in...', 'success');
        // If auto-confirm is enabled in Supabase, sign them in immediately
        setTimeout(() => {
            window.location.href = '/app.html';
        }, 1500);
    }
}

/**
 * Handle Logout
 */
export async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showToast(error.message, 'error');
    } else {
        state.reset(); // Clear global state
        window.location.href = '/index.html';
    }
}

// =============================================================================
// 3. SESSION MANAGEMENT (Route Protection)
// =============================================================================

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    const currentPath = window.location.pathname;
    
    // Logic:
    // 1. If we have a session, update global state.
    // 2. If we are on login page (index) and have session -> Go to App.
    // 3. If we are on app page and NO session -> Go to Login.

    if (session) {
        state.user = session.user;
        
        // If on Landing Page, redirect to Dashboard
        if (currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('index.html')) {
            window.location.href = '/app.html';
        }
    } else {
        // If on App Page, redirect to Landing
        if (currentPath === '/app' || currentPath === '/app.html' || currentPath.endsWith('app.html')) {
            window.location.href = '/index.html';
        }
    }
}

// =============================================================================
// 4. UI HELPERS
// =============================================================================

function setLoading(formType, isLoading) {
    const btnText = document.getElementById(`${formType}-text`);
    const loader = document.getElementById(`${formType}-loader`);
    
    if (isLoading) {
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
    }
}

function showAlert(msg, type) {
    // If on index.html, we use the alert box
    const box = document.getElementById('alert-box');
    if (box) {
        box.textContent = msg;
        box.className = `absolute top-4 left-4 right-4 p-3 rounded text-sm text-center font-medium ${
            type === 'error' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
        }`;
        box.classList.remove('hidden');
        setTimeout(() => box.classList.add('hidden'), 5000);
    } else {
        // If on app.html, use toast
        showToast(msg, type);
    }
}

// =============================================================================
// 5. INITIALIZATION
// =============================================================================

// Run immediately
checkSession();

// Event Listeners (Only attach if elements exist)
if (loginForm) loginForm.addEventListener('submit', handleLogin);
if (signupForm) signupForm.addEventListener('submit', handleSignup);

// Toggle Login/Signup Views
if (btnShowSignup) {
    btnShowSignup.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('signup-view').classList.remove('hidden');
    });
}

if (btnShowLogin) {
    btnShowLogin.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signup-view').classList.add('hidden');
        document.getElementById('login-view').classList.remove('hidden');
    });
}

// Attach logout to sidebar/header buttons
if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if (logoutBtnHeader) logoutBtnHeader.addEventListener('click', handleLogout);
