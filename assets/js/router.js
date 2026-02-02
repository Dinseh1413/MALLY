import { state, showToast, supabase } from './config.js';
import * as UI from './ui.js';
import * as Accounting from './accounting.js';
import * as Reports from './reports.js';

// =============================================================================
// 1. ROUTE DEFINITIONS
// =============================================================================
const routes = {
    'dashboard': loadDashboard,
    'voucher': loadVoucherEntry,
    'voucher-view': loadVoucherView,
    
    // Masters
    'ledger-create': loadLedgerCreate,
    'unit-create': loadUnitCreate,       // <--- New
    'item-create': loadItemCreate,       // <--- New
    
    // Reports
    'balance-sheet': loadBalanceSheet,
    'profit-loss': loadProfitLoss,
    'trial-balance': loadTrialBalance,
    'daybook': loadDayBook
};

let currentRoute = 'dashboard';

// =============================================================================
// 2. MAIN NAVIGATION CONTROLLER
// =============================================================================

export async function navigateTo(routeName) {
    // 1. Security Check
    if (routeName !== 'dashboard' && !state.currentCompany) {
        showToast('Please select or create a company first.', 'error');
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

    // 3. Clear & Loader
    const appView = document.getElementById('app-view');
    appView.innerHTML = '<div class="flex items-center justify-center h-full"><div class="loader-green"></div></div>';

    // 4. Update Header Title
    const titleMap = {
        'dashboard': 'Gateway of Mally',
        'ledger-create': 'Ledger Creation',
        'unit-create': 'Unit Creation',
        'item-create': 'Stock Item Creation',
        'voucher': 'Accounting Voucher Creation',
        'voucher-view': 'Voucher Display',
        'balance-sheet': 'Balance Sheet',
        'profit-loss': 'Profit & Loss A/c',
        'trial-balance': 'Trial Balance',
        'daybook': 'Day Book'
    };
    document.getElementById('page-title').textContent = titleMap[routeName] || 'Mally';

    // 5. Load Logic
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
        const modal = document.getElementById('modal-company');
        if (modal && !modal.open) modal.showModal();
        return;
    }
    
    try {
        const stats = await Accounting.getDashboardStats();
        container.innerHTML = UI.renderDashboard(stats);
    } catch (error) {
        console.error("Dashboard Load Error:", error);
        container.innerHTML = UI.renderEmptyDashboard(); 
    }
}

// --- MASTERS ---

async function loadLedgerCreate(container) {
    const groups = await Accounting.getGroups();
    container.innerHTML = UI.renderLedgerForm();
    UI.initLedgerFormLogic(groups);
}

async function loadUnitCreate(container) {
    container.innerHTML = UI.renderUnitForm();
    UI.initUnitFormLogic();
}

async function loadItemCreate(container) {
    const units = await Accounting.getUnits();
    container.innerHTML = UI.renderStockItemForm();
    UI.initStockItemFormLogic(units);
}

// --- TRANSACTIONS ---

async function loadVoucherEntry(container) {
    // We now need BOTH Ledgers and Stock Items for the hybrid voucher
    const [ledgers, items] = await Promise.all([
        Accounting.getLedgers(),
        Accounting.getStockItems()
    ]);
    
    container.innerHTML = UI.renderVoucherForm();
    UI.initVoucherFormLogic(ledgers, items);
}

async function loadVoucherView(container) {
    if (!state.activeVoucherId) {
        showToast("No voucher selected", "error");
        navigateTo('daybook');
        return;
    }
    try {
        const voucher = await Accounting.getVoucher(state.activeVoucherId);
        container.innerHTML = UI.renderVoucherView(voucher);
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="text-red-500">Error loading voucher: ${err.message}</div>`;
    }
}

// --- REPORTS ---

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
// 4. GLOBAL HELPER FUNCTIONS
// =============================================================================

window.openVoucher = (id) => {
    state.activeVoucherId = id;
    navigateTo('voucher-view');
};

window.deleteCurrentVoucher = async (id) => {
    if (confirm('Are you sure you want to delete this voucher? This cannot be undone.')) {
        try {
            await Accounting.deleteVoucher(id);
            showToast('Voucher deleted successfully', 'success');
            state.activeVoucherId = null;
            navigateTo('daybook');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
};

// =============================================================================
// 5. APP INITIALIZATION
// =============================================================================

async function initApp() {
    console.log("Initializing App...");
    
    // 1. Check Session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
        window.location.href = '/index.html';
        return;
    }

    state.user = session.user;
    
    // UI Updates
    const emailEl = document.getElementById('user-email');
    const initEl = document.getElementById('user-initials');
    if (emailEl) emailEl.textContent = session.user.email;
    if (initEl) initEl.textContent = session.user.email.charAt(0).toUpperCase();

    // 2. Load Companies
    try {
        const companies = await Accounting.getCompanies();
        
        // Populate Company Modal
        const listContainer = document.getElementById('company-list-container');
        if (listContainer) {
            if (companies.length === 0) {
                listContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No companies found.</p>';
            } else {
                listContainer.innerHTML = companies.map(c => `
                    <button onclick="window.selectCompany('${c.id}')" class="w-full text-left p-3 hover:bg-emerald-50 border-b border-gray-100 flex justify-between group">
                        <span class="font-medium text-gray-700 group-hover:text-emerald-700">${c.name}</span>
                        <div class="flex flex-col text-right">
                             <span class="text-xs text-gray-400">FY: ${c.financial_year_start}</span>
                             <span class="text-[10px] bg-gray-100 text-gray-500 px-1 rounded mt-1 w-fit self-end">${c.state_code || '-'}</span>
                        </div>
                    </button>
                `).join('');
            }
        }

        // 3. Select Default
        if (companies.length > 0) {
            const lastId = localStorage.getItem('mally_last_company_id');
            const target = companies.find(c => c.id === lastId) || companies[0];
            selectCompany(target);
        } else {
            state.currentCompany = null;
        }

    } catch (err) {
        console.error("Init Error:", err);
        showToast("Failed to load companies", "error");
    }

    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
    
    navigateTo('dashboard');
}

window.selectCompany = async (companyIdOrObj) => {
    let company;
    if (typeof companyIdOrObj === 'string') {
        const companies = await Accounting.getCompanies();
        company = companies.find(c => c.id === companyIdOrObj);
    } else {
        company = companyIdOrObj;
    }

    if (company) {
        state.currentCompany = company;
        localStorage.setItem('mally_last_company_id', company.id);
        
        document.getElementById('sidebar-company-name').textContent = company.name;
        document.getElementById('sidebar-fy').textContent = `FY: ${company.financial_year_start}`;
        
        document.getElementById('modal-company').close();
        navigateTo('dashboard');
        showToast(`Switched to ${company.name}`, 'success');
    }
};

// =============================================================================
// 6. EVENT LISTENERS
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();

    document.body.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        if (navItem) {
            navigateTo(navItem.dataset.route);
        }
    });
    
    const createForm = document.getElementById('form-create-company');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = createForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Creating...';
            btn.disabled = true;

            const formData = new FormData(createForm);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const newCompany = await Accounting.createCompany(data);
                showToast('Company Created!', 'success');
                document.getElementById('modal-create-company').close();
                createForm.reset();
                selectCompany(newCompany);
                initApp(); 
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }

    const btnSwitch = document.getElementById('btn-switch-company');
    if (btnSwitch) btnSwitch.addEventListener('click', () => document.getElementById('modal-company').showModal());

    const btnCreateView = document.getElementById('btn-create-company-view');
    if (btnCreateView) {
        btnCreateView.addEventListener('click', () => {
            document.getElementById('modal-company').close();
            document.getElementById('modal-create-company').showModal();
        });
    }
});
