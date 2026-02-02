import { supabase, state, showToast } from './config.js';

// =============================================================================
// 1. COMPANY MANAGEMENT
// =============================================================================

/**
 * Fetch all companies owned by the current user
 */
export async function getCompanies() {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Create a new company and trigger the default ledger setup
 */
export async function createCompany(companyData) {
    // 1. Insert Company
    const { data: company, error } = await supabase
        .from('companies')
        .insert({
            owner_id: state.user.id,
            name: companyData.name,
            financial_year_start: companyData.fy_start,
            books_beginning_from: companyData.fy_start, 
            currency_symbol: companyData.currency || '₹',
            address: companyData.address
        })
        .select()
        .single();

    if (error) throw error;

    // 2. Trigger Database Function to create default Groups & Ledgers
    const { error: rpcError } = await supabase.rpc('setup_company_defaults', {
        new_company_id: company.id
    });

    if (rpcError) {
        console.error("Defaults setup failed:", rpcError);
        showToast("Company created but defaults failed. Check DB logs.", "error");
    }

    return company;
}

// =============================================================================
// 2. MASTER DATA (Ledgers, Groups)
// =============================================================================

/**
 * Fetch all ledgers for the current company (for Autocomplete in Vouchers)
 */
export async function getLedgers() {
    if (!state.currentCompany) return [];

    const { data, error } = await supabase
        .from('ledgers')
        .select('id, name, group_id, opening_balance')
        .eq('company_id', state.currentCompany.id)
        .order('name');

    if (error) throw error;
    return data;
}

/**
 * Fetch all groups for the dropdown (e.g. "Current Assets", "Indirect Expenses")
 * Used in Ledger Creation Screen
 */
export async function getGroups() {
    if (!state.currentCompany) return [];

    const { data, error } = await supabase
        .from('groups')
        .select('id, name, primary_group, parent_id')
        .eq('company_id', state.currentCompany.id)
        .order('name');

    if (error) throw error;
    return data;
}

/**
 * Create a new Ledger (Master)
 */
export async function createLedger(ledgerData) {
    if (!state.currentCompany) throw new Error("No company selected");

    const { data, error } = await supabase
        .from('ledgers')
        .insert({
            company_id: state.currentCompany.id,
            name: ledgerData.name,
            group_id: ledgerData.groupId,
            opening_balance: ledgerData.openingBalance || 0,
            opening_balance_type: ledgerData.openingType || 'Dr',
            mailing_name: ledgerData.mailingName || null,
            gst_number: ledgerData.gst || null
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// =============================================================================
// 3. TRANSACTION ENGINE (Vouchers)
// =============================================================================

/**
 * Save a fully validated voucher to the database
 * @param {Object} voucherData { type, date, narration, entries: [{ledger_id, amount, type}] }
 */
export async function saveVoucher(voucherData) {
    if (!state.currentCompany) throw new Error("No company selected");

    // 1. Generate Voucher Number (Simple Auto-Increment Simulation)
    const vNum = `${voucherData.type.toUpperCase().substring(0, 3)}-${Date.now().toString().slice(-6)}`;

    // 2. Insert Header
    const { data: voucher, error: vError } = await supabase
        .from('vouchers')
        .insert({
            company_id: state.currentCompany.id,
            date: voucherData.date,
            type: voucherData.type,
            voucher_number: vNum,
            narration: voucherData.narration
        })
        .select()
        .single();

    if (vError) throw vError;

    // 3. Prepare Entries
    const entryRows = voucherData.entries.map(entry => ({
        voucher_id: voucher.id,
        ledger_id: entry.ledger_id,
        amount: Math.abs(entry.amount),
        type: entry.type // 'Dr' or 'Cr'
    }));

    // 4. Insert Entries
    const { error: eError } = await supabase
        .from('voucher_entries')
        .insert(entryRows);

    if (eError) {
        // Rollback strategy: Delete the voucher header if entries fail
        await supabase.from('vouchers').delete().eq('id', voucher.id);
        throw eError;
    }

    return voucher;
}

/**
 * Fetch the Day Book (All vouchers for the company)
 */
export async function getDayBook() {
    if (!state.currentCompany) return [];

    const { data, error } = await supabase
        .from('vouchers')
        .select(`
            *,
            voucher_entries ( amount )
        `)
        .eq('company_id', state.currentCompany.id)
        .order('date', { ascending: false })
        .limit(50);

    if (error) throw error;

    // Process data to calculate total amount per voucher
    return data.map(v => {
        // Total amount is Sum of Debits (since Dr=Cr, we just sum all and divide by 2)
        const total = v.voucher_entries.reduce((sum, entry) => sum + entry.amount, 0) / 2;
        return { ...v, total_amount: total };
    });
}

/**
 * Fetch a single voucher with all its entries
 * (Used for View/Print functionality)
 */
export async function getVoucher(voucherId) {
    if (!state.currentCompany) return null;

    // 1. Fetch Header
    const { data: voucher, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('id', voucherId)
        .single();

    if (error) throw error;

    // 2. Fetch Entries with Ledger Names
    const { data: entries, error: eError } = await supabase
        .from('voucher_entries')
        .select(`
            *,
            ledgers ( name )
        `)
        .eq('voucher_id', voucherId)
        .order('type', { ascending: false }); // Dr first, then Cr

    if (eError) throw eError;

    return { ...voucher, entries };
}

/**
 * Delete a voucher
 */
export async function deleteVoucher(voucherId) {
    // RLS policies ensure we can only delete our own company's data
    const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', voucherId);

    if (error) throw error;
    return true;
}

// =============================================================================
// 4. ANALYTICS & DASHBOARD
// =============================================================================

/**
 * Calculate stats for the dashboard
 */
export async function getDashboardStats() {
    if (!state.currentCompany) return null;

    // 1. Get Recent Vouchers
    const { data: recent } = await supabase
        .from('vouchers')
        .select('id, voucher_number, date, type')
        .eq('company_id', state.currentCompany.id)
        .order('created_at', { ascending: false })
        .limit(5);

    // 2. Get Cash Balance
    const cashBal = await getLedgerBalanceByName('Cash');
    
    // 3. Get Bank Balance
    const bankBal = await getGroupBalanceByName('Bank Accounts');

    // 4. Get Sales for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const { data: salesData } = await supabase
        .from('voucher_entries')
        .select('amount, vouchers!inner(date, type)')
        .eq('vouchers.company_id', state.currentCompany.id)
        .eq('vouchers.type', 'Sales')
        .gte('vouchers.date', startOfMonth.toISOString())
        .eq('type', 'Cr'); // Sales are credited

    const salesTotal = salesData ? salesData.reduce((sum, row) => sum + row.amount, 0) : 0;

    return {
        recentVouchers: recent || [],
        cashBalance: cashBal,
        bankBalance: bankBal,
        salesThisMonth: salesTotal
    };
}

/**
 * Helper: Calculate Balance for a specific Ledger Name
 */
async function getLedgerBalanceByName(nameFragment) {
    const { data: ledgers } = await supabase
        .from('ledgers')
        .select('id, opening_balance, opening_balance_type')
        .eq('company_id', state.currentCompany.id)
        .ilike('name', `%${nameFragment}%`);

    if (!ledgers || ledgers.length === 0) return 0;

    let totalBalance = 0;

    for (const ledger of ledgers) {
        let bal = ledger.opening_balance_type === 'Dr' ? ledger.opening_balance : -ledger.opening_balance;

        const { data: entries } = await supabase
            .from('voucher_entries')
            .select('amount, type')
            .eq('ledger_id', ledger.id);
        
        if (entries) {
            entries.forEach(e => {
                if (e.type === 'Dr') bal += e.amount;
                else bal -= e.amount;
            });
        }
        totalBalance += bal;
    }
    return totalBalance;
}

/**
 * Helper: Calculate Balance for a specific Group Name (e.g., Bank Accounts)
 */
async function getGroupBalanceByName(groupName) {
    // 1. Get Group ID
    const { data: group } = await supabase
        .from('groups')
        .select('id')
        .eq('company_id', state.currentCompany.id)
        .eq('name', groupName)
        .single();
    
    if (!group) return 0;

    // 2. Get all Ledgers in this group
    const { data: ledgers } = await supabase
        .from('ledgers')
        .select('id')
        .eq('group_id', group.id);

    if (!ledgers || ledgers.length === 0) return 0;

    // 3. Sum entries
    const ledgerIds = ledgers.map(l => l.id);
    const { data: entries } = await supabase
        .from('voucher_entries')
        .select('amount, type')
        .in('ledger_id', ledgerIds);

    let totalBalance = 0;
    if (entries) {
        entries.forEach(e => {
            if (e.type === 'Dr') totalBalance += e.amount;
            else totalBalance -= e.amount;
        });
    }

    return totalBalance;
}
