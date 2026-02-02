import { state, formatCurrency, formatDateInput, showToast } from './config.js';
import * as Accounting from './accounting.js';

// =============================================================================
// 1. DASHBOARD TEMPLATES
// =============================================================================

export function renderEmptyDashboard() {
    return `
        <div class="h-full flex flex-col items-center justify-center text-center opacity-60">
            <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            </div>
            <h2 class="text-xl font-bold text-gray-700">No Company Selected</h2>
            <p class="text-gray-500 max-w-sm mt-2">Select an existing company from the list or create a new one to start accounting.</p>
            <button onclick="document.getElementById('modal-company').showModal()" class="mt-6 bg-emerald-600 text-white px-6 py-2 rounded shadow hover:bg-emerald-700 transition">Select Company</button>
        </div>
    `;
}

export function renderDashboard(stats) {
    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cash In Hand</div>
                <div class="text-2xl font-bold text-gray-800">${formatCurrency(stats.cashBalance)}</div>
            </div>
            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Bank Balance</div>
                <div class="text-2xl font-bold text-gray-800">${formatCurrency(stats.bankBalance)}</div>
            </div>
            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sales (This Month)</div>
                <div class="text-2xl font-bold text-emerald-600">${formatCurrency(stats.salesThisMonth)}</div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 class="font-bold text-gray-700 mb-4 border-b pb-2">Recent Vouchers</h3>
                <div class="space-y-3">
                    ${stats.recentVouchers.length === 0 ? '<p class="text-gray-400 text-sm">No recent transactions.</p>' : ''}
                    ${stats.recentVouchers.map(v => `
                        <div class="flex justify-between items-center text-sm">
                            <div>
                                <span class="font-bold text-gray-800">${v.voucher_number}</span>
                                <span class="text-gray-500 ml-2">(${v.type})</span>
                            </div>
                            <div class="font-mono text-gray-600">${v.date}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// =============================================================================
// 2. VOUCHER ENTRY SYSTEM (The Complex Part)
// =============================================================================

export function renderVoucherForm() {
    const today = formatDateInput(new Date());
    
    return `
    <div class="max-w-5xl mx-auto">
        <div class="bg-emerald-600 text-white p-4 rounded-t-lg shadow-sm flex justify-between items-center">
            <h2 class="font-bold text-lg">Accounting Voucher Creation</h2>
            <div class="text-sm opacity-90">Company: ${state.currentCompany.name}</div>
        </div>

        <div class="bg-white border-x border-b border-gray-200 shadow-sm p-6 rounded-b-lg">
            <form id="voucher-form">
                <div class="grid grid-cols-12 gap-4 mb-6">
                    <div class="col-span-3">
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Voucher Type</label>
                        <select id="v-type" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none bg-gray-50">
                            <option value="Sales">Sales</option>
                            <option value="Purchase">Purchase</option>
                            <option value="Payment">Payment</option>
                            <option value="Receipt">Receipt</option>
                            <option value="Journal">Journal</option>
                            <option value="Contra">Contra</option>
                        </select>
                    </div>
                    <div class="col-span-3">
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Voucher No.</label>
                        <input type="text" id="v-no" value="Auto" disabled class="w-full border border-gray-200 bg-gray-100 rounded p-2 text-sm text-gray-500">
                    </div>
                    <div class="col-span-3">
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                        <input type="date" id="v-date" value="${today}" required class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none">
                    </div>
                </div>

                <div class="border border-gray-300 rounded mb-4 overflow-hidden">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-100 text-gray-600 font-bold border-b border-gray-300">
                            <tr>
                                <th class="p-2 w-20">Dr/Cr</th>
                                <th class="p-2">Particulars (Ledger)</th>
                                <th class="p-2 w-40 text-right">Debit</th>
                                <th class="p-2 w-40 text-right">Credit</th>
                                <th class="p-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody id="voucher-entries">
                            </tbody>
                    </table>
                    <div class="bg-gray-50 p-2 border-t border-gray-200">
                         <button type="button" id="btn-add-row" class="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            Add Line
                         </button>
                    </div>
                </div>

                <div class="grid grid-cols-12 gap-6 items-start">
                    <div class="col-span-8">
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Narration</label>
                        <textarea id="v-narration" rows="2" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none" placeholder="Being..."></textarea>
                    </div>
                    <div class="col-span-4">
                        <div class="bg-gray-50 rounded p-3 border border-gray-200 space-y-2">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Total Debit:</span>
                                <span class="font-bold text-gray-800" id="total-dr">0.00</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Total Credit:</span>
                                <span class="font-bold text-gray-800" id="total-cr">0.00</span>
                            </div>
                            <div class="border-t border-gray-300 pt-2 flex justify-between text-sm">
                                <span class="font-bold text-gray-600">Difference:</span>
                                <span class="font-bold text-emerald-600" id="total-diff">0.00</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-6 flex justify-end gap-3">
                    <button type="button" onclick="history.back()" class="px-6 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancel (Esc)</button>
                    <button type="submit" class="px-6 py-2 rounded bg-emerald-600 text-white shadow hover:bg-emerald-700 text-sm font-medium flex items-center gap-2">
                        <span>Save Voucher</span>
                        <span class="text-emerald-200 text-xs">(Ctrl+S)</span>
                    </button>
                </div>
            </form>
        </div>
        
        <datalist id="ledger-list"></datalist>
    </div>
    `;
}

/**
 * Handles the dynamic logic for the voucher form
 * (Adding rows, calculating totals, keyboard shortcuts)
 */
export function initVoucherFormLogic(ledgers) {
    const tbody = document.getElementById('voucher-entries');
    const datalist = document.getElementById('ledger-list');
    
    // 1. Populate Datalist
    ledgers.forEach(l => {
        const option = document.createElement('option');
        option.value = l.name;
        option.dataset.id = l.id;
        datalist.appendChild(option);
    });

    // Helper to create a row
    function createRow(index, defaultType = 'Dr') {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 transition-colors";
        tr.innerHTML = `
            <td class="p-2">
                <select class="row-type w-full bg-transparent border-none font-bold text-gray-700 focus:text-emerald-600 outline-none">
                    <option value="Dr" ${defaultType === 'Dr' ? 'selected' : ''}>Dr</option>
                    <option value="Cr" ${defaultType === 'Cr' ? 'selected' : ''}>Cr</option>
                </select>
            </td>
            <td class="p-2">
                <input type="text" list="ledger-list" class="row-ledger w-full border border-gray-300 rounded px-2 py-1 focus:ring-2 ring-emerald-500 outline-none" placeholder="Select Ledger" autocomplete="off">
            </td>
            <td class="p-2">
                <input type="number" step="0.01" class="row-dr w-full border border-gray-300 rounded px-2 py-1 text-right focus:ring-2 ring-emerald-500 outline-none ${defaultType === 'Dr' ? '' : 'bg-gray-100'}" ${defaultType === 'Dr' ? '' : 'disabled'}>
            </td>
            <td class="p-2">
                <input type="number" step="0.01" class="row-cr w-full border border-gray-300 rounded px-2 py-1 text-right focus:ring-2 ring-emerald-500 outline-none ${defaultType === 'Cr' ? '' : 'bg-gray-100'}" ${defaultType === 'Cr' ? '' : 'disabled'}>
            </td>
            <td class="p-2 text-center">
                <button type="button" class="text-gray-400 hover:text-red-500 btn-remove-row">&times;</button>
            </td>
        `;
        tbody.appendChild(tr);
        attachRowListeners(tr);
    }

    // Helper to calculate totals
    function calculateTotals() {
        let dr = 0, cr = 0;
        document.querySelectorAll('.row-dr').forEach(i => dr += parseFloat(i.value || 0));
        document.querySelectorAll('.row-cr').forEach(i => cr += parseFloat(i.value || 0));
        
        document.getElementById('total-dr').textContent = formatCurrency(dr);
        document.getElementById('total-cr').textContent = formatCurrency(cr);
        
        const diff = Math.abs(dr - cr);
        const diffEl = document.getElementById('total-diff');
        diffEl.textContent = formatCurrency(diff);
        
        if (diff === 0 && dr > 0) {
            diffEl.className = "font-bold text-emerald-600";
            diffEl.textContent = "Balanced";
        } else {
            diffEl.className = "font-bold text-red-500";
        }
    }

    function attachRowListeners(tr) {
        const typeSelect = tr.querySelector('.row-type');
        const drInput = tr.querySelector('.row-dr');
        const crInput = tr.querySelector('.row-cr');
        const ledgerInput = tr.querySelector('.row-ledger');
        const removeBtn = tr.querySelector('.btn-remove-row');

        // Toggle inputs based on Dr/Cr
        typeSelect.addEventListener('change', () => {
            if (typeSelect.value === 'Dr') {
                drInput.disabled = false;
                drInput.classList.remove('bg-gray-100');
                crInput.disabled = true;
                crInput.value = '';
                crInput.classList.add('bg-gray-100');
                drInput.focus();
            } else {
                crInput.disabled = false;
                crInput.classList.remove('bg-gray-100');
                drInput.disabled = true;
                drInput.value = '';
                drInput.classList.add('bg-gray-100');
                crInput.focus();
            }
            calculateTotals();
        });

        // Calculate on input
        drInput.addEventListener('input', calculateTotals);
        crInput.addEventListener('input', calculateTotals);

        // Remove row
        removeBtn.addEventListener('click', () => {
            if (tbody.children.length > 2) { // Keep at least 2 rows
                tr.remove();
                calculateTotals();
            } else {
                showToast("Voucher must have at least 2 lines", "error");
            }
        });

        // "Enter" key navigation (Classic Tally)
        tr.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Logic to move to next input or add new row if at end
            }
        });
    }

    // Initial Setup: Add 2 rows (1 Dr, 1 Cr)
    createRow(0, 'Dr');
    createRow(1, 'Cr');

    // Button Listeners
    document.getElementById('btn-add-row').addEventListener('click', () => {
        // Smart guess: if total Dr > Total Cr, add Cr, else Dr
        let dr = 0, cr = 0;
        document.querySelectorAll('.row-dr').forEach(i => dr += parseFloat(i.value || 0));
        document.querySelectorAll('.row-cr').forEach(i => cr += parseFloat(i.value || 0));
        createRow(tbody.children.length, dr > cr ? 'Cr' : 'Dr');
    });

    // Form Submit
    document.getElementById('voucher-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 1. Gather Data
        const type = document.getElementById('v-type').value;
        const date = document.getElementById('v-date').value;
        const narration = document.getElementById('v-narration').value;
        
        const rows = [];
        let valid = true;
        
        // 2. Parse Rows
        document.querySelectorAll('#voucher-entries tr').forEach(tr => {
            const ledgerName = tr.querySelector('.row-ledger').value;
            const drVal = parseFloat(tr.querySelector('.row-dr').value || 0);
            const crVal = parseFloat(tr.querySelector('.row-cr').value || 0);
            const entryType = tr.querySelector('.row-type').value;

            // Find Ledger ID from datalist
            const option = Array.from(datalist.options).find(o => o.value === ledgerName);
            
            if (!option) {
                showToast(`Ledger '${ledgerName}' not found`, 'error');
                valid = false;
                return;
            }
            if (drVal === 0 && crVal === 0) return; // Skip empty rows

            rows.push({
                ledger_id: option.dataset.id,
                amount: entryType === 'Dr' ? drVal : crVal,
                type: entryType
            });
        });

        if (!valid) return;
        if (rows.length < 2) return showToast('At least 2 entries required', 'error');

        try {
            await Accounting.saveVoucher({ type, date, narration, entries: rows });
            showToast('Voucher Saved Successfully', 'success');
            // Reset form
            document.getElementById('voucher-form').reset();
            tbody.innerHTML = '';
            createRow(0, 'Dr');
            createRow(1, 'Cr');
            calculateTotals();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Keyboard Shortcut: Ctrl+S to Save
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('voucher-form').requestSubmit();
        }
    });
}

// =============================================================================
// 3. REPORT TEMPLATES
// =============================================================================

export function renderBalanceSheet(data) {
    // Data expected: { liabilities: [], assets: [], totalL: 0, totalA: 0 }
    
    return `
    <div class="bg-white p-6 rounded shadow-sm border border-gray-200 print:shadow-none print:border-none">
        <div class="text-center mb-6">
            <h2 class="text-xl font-bold uppercase text-gray-800">${state.currentCompany.name}</h2>
            <h3 class="font-bold text-gray-600">Balance Sheet</h3>
            <p class="text-xs text-gray-500">as at ${new Date().toDateString()}</p>
        </div>

        <div class="flex border border-gray-300">
            <div class="w-1/2 border-r border-gray-300">
                <div class="bg-gray-100 p-2 font-bold text-center border-b border-gray-300">Liabilities</div>
                <div class="p-0">
                    <table class="w-full text-sm">
                        ${data.liabilities.map(g => `
                            <tr>
                                <td class="p-2 border-b border-gray-100">${g.name}</td>
                                <td class="p-2 border-b border-gray-100 text-right font-mono">${formatCurrency(g.amount)}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            </div>

            <div class="w-1/2">
                <div class="bg-gray-100 p-2 font-bold text-center border-b border-gray-300">Assets</div>
                <div class="p-0">
                    <table class="w-full text-sm">
                        ${data.assets.map(g => `
                            <tr>
                                <td class="p-2 border-b border-gray-100">${g.name}</td>
                                <td class="p-2 border-b border-gray-100 text-right font-mono">${formatCurrency(g.amount)}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            </div>
        </div>

        <div class="flex border-x border-b border-gray-300 font-bold bg-gray-50">
            <div class="w-1/2 p-2 text-right border-r border-gray-300 font-mono">${formatCurrency(data.totalLiabilities)}</div>
            <div class="w-1/2 p-2 text-right font-mono">${formatCurrency(data.totalAssets)}</div>
        </div>
        
        <div class="mt-4 text-center">
            <button onclick="window.print()" class="bg-gray-800 text-white px-4 py-1 rounded text-xs hover:bg-gray-700">Print Report</button>
        </div>
    </div>
    `;
}

export function renderDayBook(vouchers) {
    return `
    <div class="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
        <table class="w-full text-sm text-left">
            <thead class="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                    <th class="p-3">Date</th>
                    <th class="p-3">Particulars</th>
                    <th class="p-3">Vch Type</th>
                    <th class="p-3">Vch No.</th>
                    <th class="p-3 text-right">Debit</th>
                    <th class="p-3 text-right">Credit</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                ${vouchers.map(v => `
                    <tr class="hover:bg-gray-50 group cursor-pointer">
                        <td class="p-3 text-gray-600">${v.date}</td>
                        <td class="p-3 font-medium text-gray-800">${v.narration || 'As per details'}</td>
                        <td class="p-3 text-gray-500">${v.type}</td>
                        <td class="p-3 text-gray-500">${v.voucher_number}</td>
                        <td class="p-3 text-right font-mono font-bold text-gray-700">${formatCurrency(v.total_amount)}</td>
                        <td class="p-3 text-right font-mono font-bold text-gray-700">${formatCurrency(v.total_amount)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    `;
}

export function renderLedgerForm() {
    return `
    <div class="max-w-2xl mx-auto bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h2 class="text-lg font-bold text-gray-700 mb-6 border-b pb-2">Ledger Creation</h2>
        
        <form id="ledger-form" class="space-y-5">
            <div class="grid grid-cols-12 gap-4 items-center">
                <label class="col-span-3 text-sm font-bold text-gray-600">Name</label>
                <div class="col-span-9">
                    <input type="text" id="l-name" required class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none uppercase" placeholder="e.g. HDFC BANK">
                </div>
            </div>

            <div class="grid grid-cols-12 gap-4 items-center">
                <label class="col-span-3 text-sm font-bold text-gray-600">Under (Group)</label>
                <div class="col-span-9 relative">
                    <input type="text" id="l-group-search" list="group-list" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none" placeholder="Select Group...">
                    <datalist id="group-list"></datalist>
                    <input type="hidden" id="l-group-id">
                </div>
            </div>

            <div class="grid grid-cols-12 gap-4 items-center border-t border-gray-100 pt-4">
                <label class="col-span-3 text-sm font-bold text-gray-600">Opening Balance</label>
                <div class="col-span-5">
                    <input type="number" id="l-op-bal" step="0.01" value="0" class="w-full border border-gray-300 rounded p-2 text-sm text-right focus:ring-2 ring-emerald-500 outline-none">
                </div>
                <div class="col-span-4">
                    <select id="l-op-type" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none">
                        <option value="Dr">Dr</option>
                        <option value="Cr">Cr</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-4 items-center pt-2">
                <label class="col-span-3 text-sm font-bold text-gray-600">GST Number</label>
                <div class="col-span-9">
                    <input type="text" id="l-gst" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none uppercase" placeholder="Optional">
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button type="button" onclick="history.back()" class="px-6 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancel</button>
                <button type="submit" class="px-6 py-2 rounded bg-emerald-600 text-white shadow hover:bg-emerald-700 text-sm font-medium">Create Ledger (Enter)</button>
            </div>
        </form>
    </div>
    `;
}

export function initLedgerFormLogic(groups) {
    const datalist = document.getElementById('group-list');
    const searchInput = document.getElementById('l-group-search');
    const hiddenId = document.getElementById('l-group-id');
    const form = document.getElementById('ledger-form');

    // 1. Populate Groups
    groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.name;
        opt.dataset.id = g.id;
        opt.textContent = `(${g.primary_group})`; // Hints
        datalist.appendChild(opt);
    });

    // 2. Handle Group Selection logic (Map name to ID)
    searchInput.addEventListener('change', () => {
        const option = Array.from(datalist.options).find(o => o.value === searchInput.value);
        if (option) {
            hiddenId.value = option.dataset.id;
        } else {
            hiddenId.value = '';
        }
    });

    // 3. Handle Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('l-name').value;
        const groupId = hiddenId.value;
        const opBal = parseFloat(document.getElementById('l-op-bal').value || 0);
        const opType = document.getElementById('l-op-type').value;
        const gst = document.getElementById('l-gst').value;

        if (!groupId) {
            showToast('Please select a valid Group from the list', 'error');
            return;
        }

        try {
            await Accounting.createLedger({
                name, groupId, openingBalance: opBal, openingType: opType, gst
            });
            showToast(`Ledger '${name}' created!`, 'success');
            form.reset();
            document.getElementById('l-name').focus(); // Ready for next
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// Stubs for other reports to prevent errors
export function renderProfitLoss(data) { return renderBalanceSheet(data); /* Placeholder */ }
export function renderTrialBalance(data) { return renderBalanceSheet(data); /* Placeholder */ }
