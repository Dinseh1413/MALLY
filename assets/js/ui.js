import { state, formatCurrency, formatDateInput, showToast } from './config.js';
import * as Accounting from './accounting.js';

// =============================================================================
// 1. DASHBOARD
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
    `;
}

// =============================================================================
// 2. MASTERS: LEDGER, UNIT, STOCK ITEM
// =============================================================================

// --- LEDGER ---
export function renderLedgerForm() {
    return `
    <div class="max-w-2xl mx-auto bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h2 class="text-lg font-bold text-gray-700 mb-6 border-b pb-2">Ledger Creation</h2>
        <form id="ledger-form" class="space-y-5">
            <div class="grid grid-cols-12 gap-4 items-center">
                <label class="col-span-3 text-sm font-bold text-gray-600">Name</label>
                <div class="col-span-9"><input type="text" id="l-name" required class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none uppercase" placeholder="e.g. HDFC BANK"></div>
            </div>
            <div class="grid grid-cols-12 gap-4 items-center">
                <label class="col-span-3 text-sm font-bold text-gray-600">Under</label>
                <div class="col-span-9 relative">
                    <input type="text" id="l-group-search" list="group-list" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none" placeholder="Select Group...">
                    <datalist id="group-list"></datalist>
                    <input type="hidden" id="l-group-id">
                </div>
            </div>
            <div class="grid grid-cols-12 gap-4 items-center border-t border-gray-100 pt-4">
                <label class="col-span-3 text-sm font-bold text-gray-600">Op. Balance</label>
                <div class="col-span-5"><input type="number" id="l-op-bal" step="0.01" value="0" class="w-full border border-gray-300 rounded p-2 text-sm text-right focus:ring-2 ring-emerald-500 outline-none"></div>
                <div class="col-span-4"><select id="l-op-type" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none"><option value="Dr">Dr</option><option value="Cr">Cr</option></select></div>
            </div>
            
            <div class="grid grid-cols-12 gap-4 items-center pt-2 border-t border-gray-100 mt-2">
                <label class="col-span-12 text-xs font-bold text-gray-400 uppercase">Statutory Details</label>
            </div>
            <div class="grid grid-cols-12 gap-4 items-center">
                <label class="col-span-3 text-sm font-bold text-gray-600">GSTIN/UIN</label>
                <div class="col-span-9"><input type="text" id="l-gst" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none uppercase" placeholder="27ABCDE1234F1Z5"></div>
            </div>
            <div class="grid grid-cols-12 gap-4 items-center">
                <label class="col-span-3 text-sm font-bold text-gray-600">State</label>
                <div class="col-span-5"><input type="text" id="l-state" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none" placeholder="Maharashtra"></div>
                <div class="col-span-4"><select id="l-reg-type" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none"><option>Regular</option><option>Unregistered</option><option>Composition</option><option>Consumer</option></select></div>
            </div>

            <div class="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button type="button" onclick="history.back()" class="px-6 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancel</button>
                <button type="submit" class="px-6 py-2 rounded bg-emerald-600 text-white shadow hover:bg-emerald-700 text-sm font-medium">Create Ledger</button>
            </div>
        </form>
    </div>`;
}

export function initLedgerFormLogic(groups) {
    const datalist = document.getElementById('group-list');
    const searchInput = document.getElementById('l-group-search');
    const hiddenId = document.getElementById('l-group-id');
    const form = document.getElementById('ledger-form');

    groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.name;
        opt.dataset.id = g.id;
        opt.textContent = `(${g.primary_group})`;
        datalist.appendChild(opt);
    });

    searchInput.addEventListener('change', () => {
        const option = Array.from(datalist.options).find(o => o.value === searchInput.value);
        hiddenId.value = option ? option.dataset.id : '';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('l-name').value;
        const groupId = hiddenId.value;
        const opBal = parseFloat(document.getElementById('l-op-bal').value || 0);
        const opType = document.getElementById('l-op-type').value;
        const gst = document.getElementById('l-gst').value;
        const stateName = document.getElementById('l-state').value;
        const regType = document.getElementById('l-reg-type').value;

        if (!groupId) return showToast('Please select a valid Group', 'error');

        try {
            await Accounting.createLedger({ name, groupId, openingBalance: opBal, openingType: opType, gst, stateName, regType });
            showToast(`Ledger '${name}' created!`, 'success');
            form.reset();
            document.getElementById('l-name').focus();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// --- UNIT ---
export function renderUnitForm() {
    return `
    <div class="max-w-md mx-auto bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h2 class="text-lg font-bold text-gray-700 mb-6 border-b pb-2">Unit Creation</h2>
        <form id="unit-form" class="space-y-4">
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Symbol</label>
                <input type="text" id="u-symbol" required class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none uppercase" placeholder="PCS">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Formal Name</label>
                <input type="text" id="u-formal" required class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none" placeholder="Pieces">
            </div>
            <div class="flex justify-end gap-3 mt-6">
                <button type="button" onclick="history.back()" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" class="px-4 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700">Create</button>
            </div>
        </form>
    </div>`;
}

export function initUnitFormLogic() {
    document.getElementById('unit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await Accounting.createUnit({
                symbol: document.getElementById('u-symbol').value,
                formalName: document.getElementById('u-formal').value
            });
            showToast('Unit Created!', 'success');
            window.history.back();
        } catch (err) { showToast(err.message, 'error'); }
    });
}

// --- STOCK ITEM ---
export function renderStockItemForm() {
    return `
    <div class="max-w-2xl mx-auto bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h2 class="text-lg font-bold text-gray-700 mb-6 border-b pb-2">Stock Item Creation</h2>
        <form id="item-form" class="space-y-5">
            <div class="grid grid-cols-12 gap-4 items-center">
                <label class="col-span-3 text-sm font-bold text-gray-600">Name</label>
                <div class="col-span-9"><input type="text" id="i-name" required class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none" placeholder="e.g. iPhone 15"></div>
            </div>
            <div class="grid grid-cols-12 gap-4 items-center">
                <label class="col-span-3 text-sm font-bold text-gray-600">Unit</label>
                <div class="col-span-9"><select id="i-unit" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none"><option value="">Select Unit...</option></select></div>
            </div>
            
            <div class="grid grid-cols-12 gap-4 items-center border-t border-gray-100 pt-4">
                <label class="col-span-12 text-xs font-bold text-gray-400 uppercase">GST Details</label>
            </div>
            <div class="grid grid-cols-12 gap-4 items-center">
                <label class="col-span-3 text-sm font-bold text-gray-600">HSN/SAC</label>
                <div class="col-span-4"><input type="text" id="i-hsn" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none"></div>
                <label class="col-span-2 text-sm font-bold text-gray-600 text-right">Tax Rate %</label>
                <div class="col-span-3"><input type="number" id="i-tax" value="18" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none"></div>
            </div>

            <div class="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button type="button" onclick="history.back()" class="px-6 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancel</button>
                <button type="submit" class="px-6 py-2 rounded bg-emerald-600 text-white shadow hover:bg-emerald-700 text-sm font-medium">Create Item</button>
            </div>
        </form>
    </div>`;
}

export function initStockItemFormLogic(units) {
    const unitSelect = document.getElementById('i-unit');
    units.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.symbol;
        unitSelect.appendChild(opt);
    });

    document.getElementById('item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await Accounting.createStockItem({
                name: document.getElementById('i-name').value,
                unitId: unitSelect.value,
                hsn: document.getElementById('i-hsn').value,
                taxRate: document.getElementById('i-tax').value,
                type: 'Goods'
            });
            showToast('Stock Item Created!', 'success');
            document.getElementById('item-form').reset();
        } catch (err) { showToast(err.message, 'error'); }
    });
}

// =============================================================================
// 3. VOUCHER ENTRY SYSTEM (Hybrid: Accounting + Inventory)
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
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                        <input type="date" id="v-date" value="${today}" required class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 ring-emerald-500 outline-none">
                    </div>
                </div>

                <div id="inv-section" class="mb-6 border border-gray-200 rounded p-3 bg-blue-50">
                    <h3 class="text-xs font-bold text-blue-600 uppercase mb-2">Item Invoice Details</h3>
                    <table class="w-full text-sm text-left">
                        <thead class="bg-blue-100 text-blue-800 text-xs uppercase">
                            <tr>
                                <th class="p-2">Name of Item</th>
                                <th class="p-2 w-24 text-right">Qty</th>
                                <th class="p-2 w-24 text-right">Rate</th>
                                <th class="p-2 w-32 text-right">Amount</th>
                                <th class="p-2 w-8"></th>
                            </tr>
                        </thead>
                        <tbody id="inv-entries">
                            </tbody>
                    </table>
                    <button type="button" id="btn-add-inv" class="mt-2 text-xs text-blue-600 font-bold hover:underline">+ Add Item</button>
                </div>

                <div class="border border-gray-300 rounded mb-4 overflow-hidden">
                    <h3 class="text-xs font-bold text-gray-500 uppercase p-2 bg-gray-100 border-b">Ledger Details</h3>
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-50 text-gray-600 font-bold border-b border-gray-300">
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
                            + Add Line
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
                                <span class="text-gray-600">Total Dr:</span>
                                <span class="font-bold text-gray-800" id="total-dr">0.00</span>
                            </div>
                             <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Total Cr:</span>
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
                    <button type="submit" class="px-6 py-2 rounded bg-emerald-600 text-white shadow hover:bg-emerald-700 text-sm font-medium">Save Voucher (Ctrl+S)</button>
                </div>
            </form>
        </div>
        
        <datalist id="ledger-list"></datalist>
        <datalist id="item-list"></datalist>
    </div>`;
}

export function initVoucherFormLogic(ledgers, items = []) {
    const vType = document.getElementById('v-type');
    const invSection = document.getElementById('inv-section');
    const invBody = document.getElementById('inv-entries');
    const ledgerBody = document.getElementById('voucher-entries');
    const ledgerList = document.getElementById('ledger-list');
    const itemList = document.getElementById('item-list');

    // Populate Datalists
    ledgers.forEach(l => {
        const o = document.createElement('option');
        o.value = l.name;
        o.dataset.id = l.id;
        ledgerList.appendChild(o);
    });
    items.forEach(i => {
        const o = document.createElement('option');
        o.value = i.name;
        o.dataset.id = i.id;
        o.dataset.rate = i.tax_rate;
        itemList.appendChild(o);
    });

    // Toggle Inventory Section
    function toggleInv() {
        if (['Sales', 'Purchase'].includes(vType.value)) {
            invSection.classList.remove('hidden');
        } else {
            invSection.classList.add('hidden');
            invBody.innerHTML = ''; // Clear items if hidden
        }
    }
    vType.addEventListener('change', toggleInv);
    toggleInv(); // Init state

    // --- Inventory Row Logic ---
    function addInvRow() {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2"><input type="text" list="item-list" class="inv-item w-full border border-gray-300 rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
            <td class="p-2"><input type="number" class="inv-qty w-full border border-gray-300 rounded p-1 text-right text-sm"></td>
            <td class="p-2"><input type="number" class="inv-rate w-full border border-gray-300 rounded p-1 text-right text-sm"></td>
            <td class="p-2"><input type="number" class="inv-amt w-full bg-gray-50 border border-gray-200 rounded p-1 text-right text-sm font-bold" readonly></td>
            <td class="p-2 text-center"><button type="button" class="text-gray-400 hover:text-red-500 remove-row">&times;</button></td>
        `;
        invBody.appendChild(tr);

        const qty = tr.querySelector('.inv-qty');
        const rate = tr.querySelector('.inv-rate');
        const amt = tr.querySelector('.inv-amt');
        const rm = tr.querySelector('.remove-row');

        const calc = () => {
            amt.value = ((parseFloat(qty.value) || 0) * (parseFloat(rate.value) || 0)).toFixed(2);
            // Optionally auto-add to ledger total
        };
        qty.addEventListener('input', calc);
        rate.addEventListener('input', calc);
        rm.addEventListener('click', () => tr.remove());
    }
    document.getElementById('btn-add-inv').addEventListener('click', addInvRow);

    // --- Ledger Row Logic (Reused) ---
    function addLedgerRow(defaultType = 'Dr') {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2">
                <select class="row-type w-full bg-transparent border-none font-bold text-gray-700 outline-none">
                    <option value="Dr" ${defaultType === 'Dr' ? 'selected' : ''}>Dr</option>
                    <option value="Cr" ${defaultType === 'Cr' ? 'selected' : ''}>Cr</option>
                </select>
            </td>
            <td class="p-2"><input type="text" list="ledger-list" class="row-ledger w-full border border-gray-300 rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"></td>
            <td class="p-2"><input type="number" step="0.01" class="row-dr w-full border border-gray-300 rounded p-1 text-right text-sm ${defaultType === 'Dr' ? '' : 'bg-gray-100'}" ${defaultType === 'Dr' ? '' : 'disabled'}></td>
            <td class="p-2"><input type="number" step="0.01" class="row-cr w-full border border-gray-300 rounded p-1 text-right text-sm ${defaultType === 'Cr' ? '' : 'bg-gray-100'}" ${defaultType === 'Cr' ? '' : 'disabled'}></td>
            <td class="p-2 text-center"><button type="button" class="text-gray-400 hover:text-red-500 remove-row">&times;</button></td>
        `;
        ledgerBody.appendChild(tr);
        
        // (Add listeners similar to previous version, omitted for brevity but crucial for totals)
        const typeSelect = tr.querySelector('.row-type');
        const drInput = tr.querySelector('.row-dr');
        const crInput = tr.querySelector('.row-cr');
        
        const updateState = () => {
            if (typeSelect.value === 'Dr') {
                drInput.disabled = false; drInput.classList.remove('bg-gray-100');
                crInput.disabled = true; crInput.classList.add('bg-gray-100'); crInput.value = '';
            } else {
                crInput.disabled = false; crInput.classList.remove('bg-gray-100');
                drInput.disabled = true; drInput.classList.add('bg-gray-100'); drInput.value = '';
            }
            calcTotals();
        };
        typeSelect.addEventListener('change', updateState);
        drInput.addEventListener('input', calcTotals);
        crInput.addEventListener('input', calcTotals);
        tr.querySelector('.remove-row').addEventListener('click', () => { tr.remove(); calcTotals(); });
    }

    function calcTotals() {
        let dr = 0, cr = 0;
        document.querySelectorAll('.row-dr').forEach(i => dr += parseFloat(i.value || 0));
        document.querySelectorAll('.row-cr').forEach(i => cr += parseFloat(i.value || 0));
        
        document.getElementById('total-dr').textContent = formatCurrency(dr);
        document.getElementById('total-cr').textContent = formatCurrency(cr);
        const diff = Math.abs(dr - cr);
        const diffEl = document.getElementById('total-diff');
        diffEl.textContent = formatCurrency(diff);
        diffEl.className = (diff === 0 && dr > 0) ? "font-bold text-emerald-600" : "font-bold text-red-500";
    }

    document.getElementById('btn-add-row').addEventListener('click', () => addLedgerRow());
    // Init Rows
    addLedgerRow('Dr'); addLedgerRow('Cr');

    // --- FORM SUBMIT ---
    document.getElementById('voucher-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 1. Gather Inventory
        const invRows = [];
        document.querySelectorAll('#inv-entries tr').forEach(tr => {
            const name = tr.querySelector('.inv-item').value;
            const opt = Array.from(itemList.options).find(o => o.value === name);
            if (name && opt) {
                invRows.push({
                    item_id: opt.dataset.id,
                    qty: parseFloat(tr.querySelector('.inv-qty').value),
                    rate: parseFloat(tr.querySelector('.inv-rate').value),
                    amount: parseFloat(tr.querySelector('.inv-amt').value),
                    tax_rate: parseFloat(opt.dataset.rate)
                });
            }
        });

        // 2. Gather Ledgers
        const ledRows = [];
        document.querySelectorAll('#voucher-entries tr').forEach(tr => {
            const name = tr.querySelector('.row-ledger').value;
            const opt = Array.from(ledgerList.options).find(o => o.value === name);
            const type = tr.querySelector('.row-type').value;
            const amt = parseFloat(type === 'Dr' ? tr.querySelector('.row-dr').value : tr.querySelector('.row-cr').value) || 0;
            
            if (amt > 0 && opt) {
                ledRows.push({ ledger_id: opt.dataset.id, amount: amt, type });
            }
        });

        if (ledRows.length < 2 && invRows.length === 0) return showToast('Incomplete voucher', 'error');

        try {
            await Accounting.saveVoucher({
                type: vType.value,
                date: document.getElementById('v-date').value,
                narration: document.getElementById('v-narration').value,
                entries: ledRows,
                inventory: invRows
            });
            showToast('Voucher Saved!', 'success');
            document.getElementById('voucher-form').reset();
            invBody.innerHTML = '';
            ledgerBody.innerHTML = '';
            addLedgerRow('Dr'); addLedgerRow('Cr');
            calcTotals();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// =============================================================================
// 4. VOUCHER VIEW
// =============================================================================

export function renderVoucherView(voucher) {
    const isInvoice = voucher.type === 'Sales' || voucher.type === 'Purchase';
    // Calculate totals including inventory if any
    const totalAmount = voucher.entries.filter(e => e.type === 'Dr').reduce((acc, e) => acc + e.amount, 0);

    return `
    <div class="max-w-4xl mx-auto bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden print:shadow-none print:border-none print:w-full">
        <div class="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center print:hidden">
            <button onclick="history.back()" class="text-gray-600 font-medium">Back</button>
            <div class="flex gap-3">
                <button onclick="deleteCurrentVoucher('${voucher.id}')" class="text-red-600 font-medium">Delete</button>
                <button onclick="window.print()" class="bg-emerald-600 text-white font-medium px-4 py-2 rounded">Print</button>
            </div>
        </div>
        <div class="p-8 print:p-0">
            <div class="flex justify-between items-start mb-8">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800 uppercase">${state.currentCompany.name}</h1>
                    <p class="text-gray-500 text-sm whitespace-pre-line">${state.currentCompany.address || ''}</p>
                    <p class="text-gray-500 text-sm">GSTIN: ${state.currentCompany.gstin || '-'}</p>
                </div>
                <div class="text-right">
                    <h2 class="text-xl font-bold text-emerald-600 uppercase">${isInvoice ? 'TAX INVOICE' : voucher.type}</h2>
                    <p class="text-gray-800 font-medium mt-1"># ${voucher.voucher_number}</p>
                    <p class="text-gray-800">Date: ${voucher.date}</p>
                </div>
            </div>

            ${voucher.inventory && voucher.inventory.length > 0 ? `
            <table class="w-full text-sm border-t border-b border-gray-200 mb-6">
                <thead class="bg-gray-100 text-gray-600 uppercase text-xs">
                    <tr>
                        <th class="py-2 text-left">Description of Goods</th>
                        <th class="py-2 text-left">HSN/SAC</th>
                        <th class="py-2 text-right">Qty</th>
                        <th class="py-2 text-right">Rate</th>
                        <th class="py-2 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    ${voucher.inventory.map(i => `
                    <tr>
                        <td class="py-2 font-bold text-gray-700">${i.stock_items.name}</td>
                        <td class="py-2 text-gray-500">${i.stock_items.hsn_code || '-'}</td>
                        <td class="py-2 text-right">${i.qty}</td>
                        <td class="py-2 text-right">${formatCurrency(i.rate)}</td>
                        <td class="py-2 text-right font-mono">${formatCurrency(i.amount)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>` : ''}

            <table class="w-full text-sm border-t border-b border-gray-200 mb-6">
                <thead class="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr><th class="py-2 text-left">Particulars</th><th class="py-2 text-right">Amount</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    ${voucher.entries.map(e => `
                    <tr>
                        <td class="py-2">
                            <span class="font-bold text-gray-700">${e.ledgers.name}</span>
                            <span class="text-xs text-gray-400 ml-2">(${e.type})</span>
                        </td>
                        <td class="py-2 text-right font-mono">${formatCurrency(e.amount)}</td>
                    </tr>`).join('')}
                </tbody>
                <tfoot class="border-t border-gray-200 font-bold bg-gray-50">
                    <tr><td class="py-2 text-gray-600">Total</td><td class="py-2 text-right text-gray-800">${formatCurrency(totalAmount)}</td></tr>
                </tfoot>
            </table>

            <div class="border border-gray-200 bg-gray-50 p-4 rounded text-sm text-gray-600 mb-8">
                <span class="font-bold uppercase text-xs text-gray-400 block mb-1">Narration</span>
                ${voucher.narration || '-'}
            </div>
        </div>
    </div>`;
}

// ... (Rest of Reports: renderBalanceSheet, renderDayBook remain same as previous version)
// Just ensure renderDayBook adds the click handler we added in step 3 previously
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
                    <tr onclick="window.openVoucher('${v.id}')" class="hover:bg-gray-50 group cursor-pointer transition-colors">
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
// Stubs for other reports to prevent errors
export function renderProfitLoss(data) { return renderBalanceSheet(data); /* Placeholder */ }
export function renderTrialBalance(data) { return renderBalanceSheet(data); /* Placeholder */ }
