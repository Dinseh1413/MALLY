import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// =============================================================================
// 1. CONFIGURATION (REPLACE THESE VALUES)
// =============================================================================
const SUPABASE_URL = 'https://axyraxrxizknbptyfnhz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JBn5a8mYFO9V79Q1oD8zZQ_iwMeDKN-';

if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    console.error('🛑 CRITICAL: Supabase credentials not set in assets/js/config.js');
    alert('Developer: Please set your Supabase URL and Key in assets/js/config.js');
}

// =============================================================================
// 2. INITIALIZE SUPABASE
// =============================================================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================================================
// 3. GLOBAL STATE MANAGEMENT
// =============================================================================
// This object holds the "live" data used across the app
export const state = {
    user: null,             // The logged-in user object
    currentCompany: null,   // The currently selected company object
    
    // Helper to clear state on logout
    reset() {
        this.user = null;
        this.currentCompany = null;
        localStorage.removeItem('mally_last_company_id');
    }
};

// =============================================================================
// 4. GLOBAL UTILITIES
// =============================================================================

/**
 * Format a number as currency (Indian Format)
 * @param {number} amount 
 * @returns {string} e.g. "1,23,456.00"
 */
export function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '0.00';
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
}

/**
 * Format a date string for input fields (YYYY-MM-DD)
 * @param {string|Date} dateVal 
 * @returns {string}
 */
export function formatDateInput(dateVal) {
    const d = new Date(dateVal);
    return d.toISOString().split('T')[0];
}

/**
 * Show a Toast Notification
 * @param {string} message 
 * @param {'success'|'error'|'info'} type 
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return; // Guard clause if UI isn't ready

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-4 text-gray-400 hover:text-gray-600">&times;</button>
    `;

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
