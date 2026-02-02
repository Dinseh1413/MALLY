import { supabase, state } from './config.js';

// =============================================================================
// 1. SHARED CALCULATION ENGINE
// =============================================================================

/**
 * Calculates the closing balance for a specific Ledger ID
 * Returns positive for Dr, negative for Cr (mathematically)
 */
async function getLedgerClosingBalance(ledgerId, openingBal, openingType) {
    // 1. Start with Opening Balance
    let balance = (openingType === 'Dr') ? openingBal : -openingBal;

    // 2. Fetch all entries for this ledger
    // (Optimization: In a real app, use a DB view or RPC function)
    const { data: entries, error } = await supabase
        .from('voucher_entries')
        .select('amount, type')
        .eq('ledger_id', ledgerId);

    if (error) throw error;

    // 3. Apply Debits and Credits
    entries.forEach(e => {
        if (e.type === 'Dr') balance += e.amount;
        else balance -= e.amount;
    });

    return balance;
}

/**
 * Recursive function to get total balance of a Group and its children
 * Returns { name, amount (absolute), type ('Dr'/'Cr') }
 */
async function getGroupSummary(companyId) {
    // Fetch all Groups
    const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .eq('company_id', companyId);

    // Fetch all Ledgers
    const { data: ledgers } = await supabase
        .from('ledgers')
        .select('*')
        .eq('company_id', companyId);

    const groupBalances = {}; // Map: group_id -> total_balance (signed)

    // 1. Calculate Individual Ledger Balances
    const ledgerBalances = {}; // Map: ledger_id -> balance
    for (const l of ledgers) {
        ledgerBalances[l.id] = await getLedgerClosingBalance(l.id, l.opening_balance, l.opening_balance_type);
    }

    // 2. Sum Ledgers into their Groups
    groups.forEach(g => {
        groupBalances[g.id] = 0;
        // Find ledgers belonging to this group
        const groupLedgers = ledgers.filter(l => l.group_id === g.id);
        groupLedgers.forEach(l => {
            groupBalances[g.id] += ledgerBalances[l.id];
        });
    });

    // 3. Rollup Sub-groups to Parents (Simple 2-level depth for MVP)
    // Tally logic is deep, but here we iterate to add child group balances to parent
    // We run this loop twice to handle nesting
    for (let i = 0; i < 2; i++) {
        groups.forEach(g => {
            if (g.parent_id) {
                // Add this group's total to its parent
                if (groupBalances[g.parent_id] !== undefined) {
                    // Logic: We don't want to double count if we iterate, 
                    // ideally we build a tree. For MVP, we'll assume flat aggregation at Report Level.
                }
            }
        });
    }
    
    return { groups, groupBalances, ledgerBalances };
}

// =============================================================================
// 2. BALANCE SHEET GENERATOR
// =============================================================================

export async function generateBalanceSheet() {
    if (!state.currentCompany) return null;

    const { groups, groupBalances } = await getGroupSummary(state.currentCompany.id);

    const liabilities = [];
    const assets = [];
    let totalLiabilities = 0;
    let totalAssets = 0;

    // Helper to format output object
    const formatObj = (g) => ({
        name: g.name,
        amount: Math.abs(groupBalances[g.id])
    });

    // Filter Primary Groups
    groups.forEach(g => {
        // Skip sub-groups for the Top-Level view (simplified)
        // In real Tally, we show the tree. Here we show top-level groups.
        if (g.parent_id) return; 

        const bal = groupBalances[g.id];
        if (bal === 0) return; // Hide zero balance groups

        if (g.primary_group === 'Assets') {
            assets.push(formatObj(g));
            totalAssets += Math.abs(bal);
        } else if (g.primary_group === 'Liabilities') {
            liabilities.push(formatObj(g));
            totalLiabilities += Math.abs(bal);
        }
        // Note: Profit & Loss (Income - Expense) needs to be calculated and added to Liabilities (Reserves)
    });

    // Calculate Profit & Loss (Income - Expenses)
    let totalIncome = 0;
    let totalExpense = 0;
    
    groups.forEach(g => {
        if (g.parent_id) return;
        const bal = groupBalances[g.id];
        if (g.primary_group === 'Income') totalIncome += Math.abs(bal); // Income is Cr (negative), take abs
        if (g.primary_group === 'Expenses') totalExpense += Math.abs(bal); // Expense is Dr (positive)
    });

    const netProfit = totalIncome - totalExpense;

    // Add P&L to Liabilities side (if profit) or Assets (if loss)
    // Standard Accounting: Profit goes to Liability side (increases Capital)
    if (netProfit !== 0) {
        liabilities.push({ name: "Profit & Loss A/c", amount: netProfit });
        totalLiabilities += netProfit;
    }

    return {
        liabilities,
        assets,
        totalLiabilities,
        totalAssets
    };
}

// =============================================================================
// 3. TRIAL BALANCE GENERATOR
// =============================================================================

export async function generateTrialBalance() {
    if (!state.currentCompany) return null;

    const { groups, ledgerBalances, groups: allGroups } = await getGroupSummary(state.currentCompany.id);
    const { data: ledgers } = await supabase.from('ledgers').select('*').eq('company_id', state.currentCompany.id);

    const reportData = [];
    let totalDr = 0;
    let totalCr = 0;

    ledgers.forEach(l => {
        const bal = ledgerBalances[l.id];
        if (bal === 0) return;

        // Find group name
        const group = allGroups.find(g => g.id === l.group_id);
        
        reportData.push({
            name: l.name,
            groupName: group ? group.name : '-',
            debit: bal > 0 ? bal : 0,
            credit: bal < 0 ? Math.abs(bal) : 0
        });

        if (bal > 0) totalDr += bal;
        else totalCr += Math.abs(bal);
    });

    return {
        rows: reportData,
        totalDr,
        totalCr
    };
}

// =============================================================================
// 4. PROFIT & LOSS GENERATOR
// =============================================================================

export async function generateProfitLoss() {
    // Reuses Balance Sheet Logic but filters for Income/Expense
    if (!state.currentCompany) return null;

    const { groups, groupBalances } = await getGroupSummary(state.currentCompany.id);

    const expenses = [];
    const incomes = [];
    let totalExp = 0;
    let totalInc = 0;

    groups.forEach(g => {
        if (g.parent_id) return; // Top level only
        const bal = groupBalances[g.id];
        if (bal === 0) return;

        if (g.primary_group === 'Expenses') {
            expenses.push({ name: g.name, amount: Math.abs(bal) });
            totalExp += Math.abs(bal);
        } else if (g.primary_group === 'Income') {
            incomes.push({ name: g.name, amount: Math.abs(bal) });
            totalInc += Math.abs(bal);
        }
    });

    const netProfit = totalInc - totalExp;

    return {
        liabilities: expenses, // Reusing variable names for UI compatibility (Left Side)
        assets: incomes,       // (Right Side)
        totalLiabilities: totalExp, 
        totalAssets: totalInc,
        netProfit: netProfit
    };
}
