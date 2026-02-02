import { state, showToast } from './config.js';
import * as UI from './ui.js';
import * as Accounting from './accounting.js';
import * as Reports from './reports.js';

// =============================================================================
// 1. ROUTE DEFINITIONS
// =============================================================================
// Maps route names to their setup functions
const routes = {
    'dashboard': loadDashboard,
    'voucher': loadVoucherEntry,
    'balance-sheet': loadBalanceSheet,
    'profit-loss': loadProfitLoss,
    'trial-balance': loadTrialBalance,
    'daybook': loadDayBook
};

let currentRoute = 'dashboard';

// =============================================================================
// 2. MAIN NAVIGATION CONTROLLER
// =============================================================================

/**
 * Loads a specific view into the #app-view container
 * @param {string} routeName 
 */
export async function navigateTo(routeName) {
    console.log(`Navigating to: ${routeName}`);

    // 1. Security Check: Must have a selected company (unless we are just loading initial dashboard)
    if (routeName !== 'dashboard' && !state.currentCompany) {
        showToast('Please select or create a company first.', 'error');
        // Open company modal
        const modal = document.getElementById('modal-company');
        if (modal) modal.showModal();
        return;
    }

    // 2. Update UI Active State
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-emerald-50', 'text-emerald-700', 'font-bold');
        if (el.dataset.route === routeName) {
            el.classList.add('bg-emerald-50', 'text-emerald-700', 'font-bold');
        }
    });

    // 3. Clear current view
    const appView = document.getElementById('app-view');
    appView.innerHTML = '<div class="flex items-center justify-center h-full"><div class="loader-green"></div></div>';

    // 4. Update Header Title
    const titleMap = {
        'dashboard': 'Gateway of Mally',
        'voucher': 'Accounting Voucher Creation',
        'balance-sheet': 'Balance Sheet',
        'profit-loss': 'Profit & Loss A/c',
        'trial-balance': 'Trial Balance',
        'daybook': 'Day Book'
    };
    document.getElementById('page-title').textContent = titleMap[routeName] || 'Mally';

    // 5. Load the specific View Logic
    // We use a small timeout to allow the loader to render (better UX)
    setTimeout(async () => {
        try {
            if (routes[routeName]) {
                await routes[routeName](appView);
                currentRoute = routeName;
            } else {
                appView.innerHTML = `<div class="p-4 text-red-500">Route not found: ${routeName}</div>`;
            }
        } catch (error) {
            console.error(error);
            appView.innerHTML = `<div class="p-4 text-red-500">Error loading view: ${error.message}</div>`;
        }
    }, 100);
}

// =============================================================================
// 3. INDIVIDUAL VIEW LOADERS
// =============================================================================

async function loadDashboard(container) {
    if (!state.currentCompany) {
        container.innerHTML = UI.renderEmptyDashboard();
        // Auto open modal
        const modal = document.getElementById('modal-company');
        if (modal && !modal.open) modal.showModal();
        return;
    }
    
    // Fetch dashboard stats
    const stats = await Accounting.getDashboardStats();
    container.innerHTML = UI.renderDashboard(stats);
}

async function loadVoucherEntry(container) {
    // 1. Fetch ledgers for autocomplete
    const ledgers = await Accounting.getLedgers();
    
    // 2. Render Form
    container.innerHTML = UI.renderVoucherForm();
    
    // 3. Initialize Form Logic (Event listeners, calculators)
    UI.initVoucherFormLogic(ledgers);
}

async function loadBalanceSheet(container) {
    const data = await Reports.generateBalanceSheet();
    container.innerHTML = UI.renderBalanceSheet(data);
}

async function loadProfitLoss(container) {
    const data = await Reports.generateProfitLoss();
    container.innerHTML = UI.renderProfitLoss(data);
}

async function loadTrialBalance(container) {
    const data = await Reports.generateTrialBalance();
    container.innerHTML = UI.renderTrialBalance(data);
}

async function loadDayBook(container) {
    const vouchers = await Accounting.getDayBook();
    container.innerHTML = UI.renderDayBook(vouchers);
}

// =============================================================================
// 4. INITIALIZATION HANDLERS
// =============================================================================

// Listen for Sidebar clicks
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (e) => {
        // Handle Sidebar Navigation
        const navItem = e.target.closest('.nav-item');
        if (navItem) {
            const route = navItem.dataset.route;
            navigateTo(route);
        }
    });

    // Handle Browser Back/Forward
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.route) {
            navigateTo(e.state.route);
        }
    });
});
