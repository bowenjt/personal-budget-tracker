# Personal Budget Tracker

A simple browser-based budget tracker built with HTML, CSS, and JavaScript. It helps users record income and expenses, monitor their balance, and review spending by category in one place.

## Overview

This project is designed for quick, everyday budgeting without the need for a backend or database. Transactions are stored in the browser using `localStorage`, so the data remains available on refresh.

Users can:

- Add income or expense transactions
- Enter a description, amount, date, and category
- View total income, total expenses, and current balance
- See category-based spending breakdowns
- Search and filter transactions by type or text
- Delete individual entries or clear all saved data
- Export transaction history as a CSV file

## Features

- Dynamic DOM updates for adding, removing, and displaying transactions without page reloads
- Real-time summary cards that update income, expenses, and balance values as users interact with the app
- JavaScript-driven category breakdown that recalculates and redraws expense totals based on the current data
- Search and filter controls that manipulate the rendered transaction list in the DOM to match user input
- Interactive form behavior that switches between expense and income categories using DOM event listeners
- Browser persistence with `localStorage` so transaction data remains available after refresh
- CSV export for easy backup or reporting

## Project Structure

- `index.html` — app layout and UI structure
- `style.css` — styling, layout, and visual design
- `script.js` — transaction logic, calculations, rendering, and storage

## How to Run

1. Open the project folder in your browser.
2. Launch `index.html` directly in a browser, or use a local development server if preferred.
3. Start adding transactions to track your spending and income.

## Example Use Case

A user can log:

- Salary income
- Rent expense
- Grocery spending
- Transportation costs

The app updates the summary totals instantly and shows how much is being spent across categories.

## Notes

This app is intentionally lightweight and client-side only. It is ideal for personal budgeting demos, quick prototypes, or learning projects focused on JavaScript DOM interaction and browser storage.
