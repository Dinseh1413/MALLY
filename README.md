# Mally - Cloud Accounting Software

**Mally** is a modern, cloud-based double-entry accounting system designed to replicate the speed and keyboard-centric workflow of Tally, built for the web.

It features multi-tenancy, real-time data synchronization, strict accounting validations, and a lightweight, professional UI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Alpha-orange.svg)
![Stack](https://img.shields.io/badge/stack-Supabase_HTML_Tailwind-green.svg)

## 🚀 Key Features

* **Multi-Company Architecture:** Manage multiple independent companies under a single user account.
* **Double-Entry Bookkeeping:** Strict debit/credit validation ensures books always balance.
* **Tally-like UX:** Keyboard-first navigation (Shortcuts for Vouchers, Reports).
* **Voucher Management:** Support for Sales, Purchase, Payment, Receipt, Journal, and Contra vouchers.
* **Real-time Reports:** Instant generation of Balance Sheets, Profit & Loss, and Trial Balances.
* **Secure:** Row Level Security (RLS) ensures complete data isolation between companies.
* **Export:** Generate professional PDF reports and Excel dumps.

## 🛠️ Tech Stack

* **Frontend:** HTML5, Vanilla JavaScript (ES Modules), Tailwind CSS (via CDN for simplicity).
* **Backend:** Supabase (PostgreSQL).
* **Auth:** Supabase Auth (Email/Password).
* **Realtime:** Supabase Realtime (WebSockets).
* **Libraries:** `jspdf` (PDF Generation), `sheetjs` (Excel Export).
* **Hosting:** Vercel / Netlify / GitHub Pages.

## 📂 Project Structure

```text
/mally
├── assets
│   ├── css
│   │   └── style.css       # Custom overrides for Tally-like focus states
│   └── js
│       ├── config.js       # Supabase client & global state
│       ├── auth.js         # Authentication logic
│       ├── router.js       # SPA Routing logic
│       ├── accounting.js   # Core double-entry validation engine
│       ├── reports.js      # Financial report generation
│       └── ui.js           # DOM manipulation & Keyboard handlers
├── index.html              # Login & Landing Page
├── app.html                # Main Accounting Dashboard
├── schema.sql              # Database Database Schema
├── vercel.json             # Deployment configuration
└── README.md               # Documentation
