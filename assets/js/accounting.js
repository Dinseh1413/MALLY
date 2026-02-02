import { supabase, state, showToast } from './config.js';

// =============================================================================
// 1. COMPANY MANAGEMENT
// =============================================================================

export async function getCompanies() {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function createCompany(companyData) {
    const { data: company, error } = await supabase
        .from('companies')
        .insert({
            owner_id: state.user.id,
            name: companyData.name,
            gstin: companyData.gstin,
            state_name: companyData.state_name,
            state_code: companyData.state_code,
            financial_year_start: companyData.fy_start,
            books_beginning_from: companyData.fy_start, 
            currency_symbol: companyData.currency || '₹',
            address: companyData.address
        })
        .select()
        .single();

    if (error) throw error;

    const { error: rpcError } = await supabase.rpc('setup_company_defaults', {
        new_company_id: company.id
    });

    if (rpcError) {
        console.error("Defaults setup failed:", rpcError);
        showToast("Company created but defaults failed.", "error");
    }

    return company;
}

// =============================================================================
// 2. MASTER DATA MANAGEMENT (CRUD)
// =============================================================================

export async function getGroups() {
    if (!state.currentCompany) return [];
    const { data, error } = await supabase.from('groups').select('*').eq('company_id', state.currentCompany.id).order('name');
    if (error) throw error;
    return data;
}

// --- LEDGERS ---

export async function getLedgers() {
    if (!state.currentCompany) return [];
    // Now fetching Group Name for the Master List view
    const { data, error } = await supabase
        .from('ledgers')
        .select('*, groups(name)')
        .eq('company_id', state.currentCompany.id)
        .order('name');
    if (error) throw error;
    return data;
}

export async function getLedger(id) {
    const { data, error } = await supabase
        .from('ledgers')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

export async function createLedger(ledgerData) {
    if (!state.currentCompany) throw new Error("No company selected");

    const payload = {
        name: ledgerData.name,
        group_id: ledgerData.groupId,
        opening_balance: ledgerData.openingBalance || 0,
        opening_balance_type: ledgerData.openingType || 'Dr',
        gstin: ledgerData.gst || null,
        state_name: ledgerData.stateName || null,
        registration_type: ledgerData.regType || 'Regular'
    };

    if (ledgerData.id) {
        // UPDATE Existing
        const { data, error } = await supabase
            .from('ledgers')
            .update(payload)
            .eq('id', ledgerData.id)
            .select().single();
        if (error) throw error;
        return data;
    } else {
        // INSERT New
        const { data, error } = await supabase
            .from('ledgers')
            .insert({ ...payload, company_id: state.currentCompany.id })
            .select().single();
        if (error) throw error;
        return data;
    }
}

export async function deleteLedger(id) {
    const { error } = await supabase.from('ledgers').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// --- UNITS ---

export async function getUnits() {
    if (!state.currentCompany) return [];
    const { data, error } = await supabase.from('units').select('*').eq('company_id', state.currentCompany.id);
    if (error) throw error;
    return data;
}

export async function createUnit(unitData) {
    const payload = {
        symbol: unitData.symbol,
        formal_name: unitData.formalName
    };

    if (unitData.id) {
        const { data, error } = await supabase.from('units').update(payload).eq('id', unitData.id).select().single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase.from('units').insert({ ...payload, company_id: state.currentCompany.id }).select().single();
        if (error) throw error;
        return data;
    }
}

export async function deleteUnit(id) {
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// --- STOCK ITEMS ---

export async function getStockItems() {
    if (!state.currentCompany) return [];
    const { data, error } = await supabase
        .from('stock_items')
        .select('*, units(symbol)')
        .eq('company_id', state.currentCompany.id)
        .order('name');
    if (error) throw error;
    return data;
}

export async function getStockItem(id) {
    const { data, error } = await supabase.from('stock_items').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
}

export async function createStockItem(itemData) {
    const payload = {
        name: itemData.name,
        unit_id: itemData.unitId,
        hsn_code: itemData.hsn,
        tax_rate: itemData.taxRate,
        type: itemData.type || 'Goods'
    };

    if (itemData.id) {
        const { data, error } = await supabase.from('stock_items').update(payload).eq('id', itemData.id).select().single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase.from('stock_items').insert({ ...payload, company_id: state.currentCompany.id }).select().single();
        if (error) throw error;
        return data;
    }
}

export async function deleteStockItem(id) {
    const { error } = await supabase.from('stock_items').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// =============================================================================
// 3. TRANSACTION ENGINE (Vouchers)
// =============================================================================

/**
 * Save Voucher (Updated to include Party Details)
 */
export async function saveVoucher(voucherData) {
    if (!state.currentCompany) throw new Error("No company selected");

    const vNum = `${voucherData.type.toUpperCase().substring(0, 3)}-${Date.now().toString().slice(-6)}`;

    // 1. Insert Header (Now includes party details)
    const { data: voucher, error: vError } = await supabase
        .from('vouchers')
        .insert({
            company_id: state.currentCompany.id,
            date: voucherData.date,
            type: voucherData.type,
            voucher_number: vNum,
            narration: voucherData.narration,
            
            // New Party Fields
            party_name: voucherData.party_name || null,
            party_gstin: voucherData.party_gstin || null,
            party_address: voucherData.party_address || null
        })
        .select()
        .single();

    if (vError) throw vError;

    try {
        // 2. Insert Accounting Entries
        const accountRows = voucherData.entries.map(e => ({
            voucher_id: voucher.id,
            ledger_id: e.ledger_id,
            amount: Math.abs(e.amount),
            type: e.type
        }));

        const { error: accError } = await supabase.from('voucher_entries').insert(accountRows);
        if (accError) throw accError;

        // 3. Insert Inventory Entries
        if (voucherData.inventory && voucherData.inventory.length > 0) {
            const inventoryRows = voucherData.inventory.map(i => ({
                voucher_id: voucher.id,
                stock_item_id: i.item_id,
                qty: i.qty,
                rate: i.rate,
                amount: i.amount,
                tax_rate: i.tax_rate || 0
            }));

            const { error: invError } = await supabase.from('inventory_entries').insert(inventoryRows);
            if (invError) throw invError;
        }

        return voucher;

    } catch (err) {
        // Rollback
        await supabase.from('vouchers').delete().eq('id', voucher.id);
        throw err;
    }
}

/**
 * Fetch Voucher Details
 */
export async function getVoucher(voucherId) {
    if (!state.currentCompany) return null;

    // 1. Fetch Header (Will automatically include new columns: party_name, etc.)
    const { data: voucher, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('id', voucherId)
        .single();

    if (error) throw error;

    // 2. Fetch Ledger Entries
    const { data: accEntries } = await supabase
        .from('voucher_entries')
        .select(`*, ledgers ( name, gstin, state_name, state_code, mailing_address )`)
        .eq('voucher_id', voucherId)
        .order('type', { ascending: false });

    // 3. Fetch Inventory Entries
    const { data: invEntries } = await supabase
        .from('inventory_entries')
        .select('*, stock_items(name, hsn_code)')
        .eq('voucher_id', voucherId);

    return { 
        ...voucher, 
        entries: accEntries, 
        inventory: invEntries || [] 
    };
}

export async function deleteVoucher(voucherId) {
    const { error } = await supabase.from('vouchers').delete().eq('id', voucherId);
    if (error) throw error;
    return true;
}

export async function getDayBook() {
    if (!state.currentCompany) return [];
    const { data, error } = await supabase
        .from('vouchers')
        .select('*, voucher_entries(amount)')
        .eq('company_id', state.currentCompany.id)
        .order('date', { ascending: false })
        .limit(50);

    if (error) throw error;

    return data.map(v => {
        const total = v.voucher_entries ? v.voucher_entries.reduce((sum, e) => sum + e.amount, 0) / 2 : 0;
        return { ...v, total_amount: total };
    });
}

// =============================================================================
// 4. ANALYTICS
// =============================================================================

export async function getDashboardStats() {
    if (!state.currentCompany) return null;

    const { data: recent } = await supabase
        .from('vouchers')
        .select('id, voucher_number, date, type')
        .eq('company_id', state.currentCompany.id)
        .order('created_at', { ascending: false })
        .limit(5);

    const cashBal = await getLedgerBalanceByName('Cash');
    const bankBal = await getGroupBalanceByName('Bank Accounts');

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const { data: salesData } = await supabase
        .from('voucher_entries')
        .select('amount, vouchers!inner(date, type)')
        .eq('vouchers.company_id', state.currentCompany.id)
        .eq('vouchers.type', 'Sales')
        .gte('vouchers.date', startOfMonth.toISOString())
        .eq('type', 'Cr');

    const salesTotal = salesData ? salesData.reduce((sum, row) => sum + row.amount, 0) : 0;

    return {
        recentVouchers: recent || [],
        cashBalance: cashBal,
        bankBalance: bankBal,
        salesThisMonth: salesTotal
    };
}

async function getLedgerBalanceByName(nameFragment) {
    const { data: ledgers } = await supabase.from('ledgers').select('id, opening_balance, opening_balance_type').eq('company_id', state.currentCompany.id).ilike('name', `%${nameFragment}%`);
    if (!ledgers || ledgers.length === 0) return 0;

    let total = 0;
    for (const l of ledgers) {
        let bal = l.opening_balance_type === 'Dr' ? l.opening_balance : -l.opening_balance;
        const { data: entries } = await supabase.from('voucher_entries').select('amount, type').eq('ledger_id', l.id);
        if (entries) entries.forEach(e => bal += (e.type === 'Dr' ? e.amount : -e.amount));
        total += bal;
    }
    return total;
}

async function getGroupBalanceByName(groupName) {
    const { data: group } = await supabase.from('groups').select('id').eq('company_id', state.currentCompany.id).eq('name', groupName).single();
    if (!group) return 0;

    const { data: ledgers } = await supabase.from('ledgers').select('id').eq('group_id', group.id);
    if (!ledgers || ledgers.length === 0) return 0;
    
    const ids = ledgers.map(l => l.id);
    const { data: entries } = await supabase.from('voucher_entries').select('amount, type').in('ledger_id', ids);
    
    let total = 0;
    if (entries) entries.forEach(e => total += (e.type === 'Dr' ? e.amount : -e.amount));
    return total;
}
