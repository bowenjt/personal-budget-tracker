(function () {
  'use strict';

  var STORAGE_KEY = 'budgetTracker.transactions.v1';

  var EXPENSE_CATEGORIES = [
    'Housing', 'Food', 'Transportation', 'Utilities',
    'Entertainment', 'Health', 'Shopping', 'Other'
  ];
  var INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];

  // Fixed categorical color order — must match the --cat-N slots in style.css
  var CATEGORY_COLOR_VAR = {
    'Housing': '--cat-1',
    'Food': '--cat-2',
    'Transportation': '--cat-3',
    'Utilities': '--cat-4',
    'Entertainment': '--cat-5',
    'Health': '--cat-6',
    'Shopping': '--cat-7',
    'Other': '--cat-8'
  };

  var currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  var dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  // -------- State --------

  var state = {
    transactions: loadTransactions(),
    currentType: 'expense',
    filter: 'all',
    search: ''
  };

  // -------- Persistence --------

  function loadTransactions() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Could not read saved transactions:', err);
      return [];
    }
  }

  function saveTransactions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
    } catch (err) {
      console.error('Could not save transactions:', err);
    }
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'txn-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  // -------- DOM refs --------

  var form = document.getElementById('transaction-form');
  var btnExpense = document.getElementById('btn-expense');
  var btnIncome = document.getElementById('btn-income');
  var categorySelect = document.getElementById('category');
  var descriptionInput = document.getElementById('description');
  var amountInput = document.getElementById('amount');
  var dateInput = document.getElementById('date');

  var statIncomeEl = document.getElementById('stat-income');
  var statExpensesEl = document.getElementById('stat-expenses');
  var statBalanceEl = document.getElementById('stat-balance');
  var balanceTile = document.getElementById('balance-tile');

  var categoryBreakdownEl = document.getElementById('category-breakdown');
  var categoryEmptyEl = document.getElementById('category-empty');

  var tbody = document.getElementById('transaction-tbody');
  var tableEmptyEl = document.getElementById('table-empty');
  var transactionCountEl = document.getElementById('transaction-count');

  var searchInput = document.getElementById('search-input');
  var filterButtons = document.querySelectorAll('.filter-btn');

  var exportBtn = document.getElementById('export-btn');
  var clearBtn = document.getElementById('clear-btn');

  // -------- Init --------

  function init() {
    dateInput.value = todayISO();
    populateCategories('expense');

    btnExpense.addEventListener('click', function () { setType('expense'); });
    btnIncome.addEventListener('click', function () { setType('income'); });

    form.addEventListener('submit', handleSubmit);

    searchInput.addEventListener('input', function (e) {
      state.search = e.target.value.trim().toLowerCase();
      renderTable();
    });

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterButtons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.filter = btn.getAttribute('data-filter');
        renderTable();
      });
    });

    exportBtn.addEventListener('click', exportCSV);
    clearBtn.addEventListener('click', handleClearAll);

    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('.delete-btn');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      deleteTransaction(id);
    });

    renderAll();
  }

  function todayISO() {
    var d = new Date();
    var offset = d.getTimezoneOffset();
    var local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  }

  function setType(type) {
    state.currentType = type;
    btnExpense.classList.toggle('active', type === 'expense');
    btnIncome.classList.toggle('active', type === 'income');
    populateCategories(type);
  }

  function populateCategories(type) {
    var list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    categorySelect.innerHTML = list.map(function (c) {
      return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>';
    }).join('');
  }

  // -------- Actions --------

  function handleSubmit(e) {
    e.preventDefault();

    var description = descriptionInput.value.trim();
    var amount = parseFloat(amountInput.value);
    var date = dateInput.value;
    var category = categorySelect.value;

    if (!description || !isFinite(amount) || amount <= 0 || !date) {
      return;
    }

    state.transactions.push({
      id: makeId(),
      type: state.currentType,
      description: description,
      amount: Math.round(amount * 100) / 100,
      category: category,
      date: date
    });

    saveTransactions();
    renderAll();

    form.reset();
    dateInput.value = todayISO();
    descriptionInput.focus();
  }

  function deleteTransaction(id) {
    state.transactions = state.transactions.filter(function (t) { return t.id !== id; });
    saveTransactions();
    renderAll();
  }

  function handleClearAll() {
    if (state.transactions.length === 0) return;
    var confirmed = window.confirm('Delete all transactions? This cannot be undone.');
    if (!confirmed) return;
    state.transactions = [];
    saveTransactions();
    renderAll();
  }

  // -------- Derived data --------

  function getTotals() {
    var income = 0, expenses = 0;
    state.transactions.forEach(function (t) {
      if (t.type === 'income') income += t.amount;
      else expenses += t.amount;
    });
    return { income: income, expenses: expenses, balance: income - expenses };
  }

  function getCategoryTotals() {
    var totals = {};
    state.transactions.forEach(function (t) {
      if (t.type !== 'expense') return;
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return totals;
  }

  function getFilteredTransactions() {
    return state.transactions
      .filter(function (t) {
        if (state.filter !== 'all' && t.type !== state.filter) return false;
        if (state.search && t.description.toLowerCase().indexOf(state.search) === -1) return false;
        return true;
      })
      .slice()
      .sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return 0;
      });
  }

  // -------- Rendering --------

  function renderAll() {
    renderSummary();
    renderCategoryBreakdown();
    renderTable();
  }

  function renderSummary() {
    var totals = getTotals();
    statIncomeEl.textContent = currencyFormatter.format(totals.income);
    statExpensesEl.textContent = currencyFormatter.format(totals.expenses);
    statBalanceEl.textContent = currencyFormatter.format(totals.balance);

    balanceTile.classList.remove('positive', 'negative');
    balanceTile.classList.add(totals.balance >= 0 ? 'positive' : 'negative');
  }

  function renderCategoryBreakdown() {
    var totals = getCategoryTotals();
    var entries = Object.keys(totals).map(function (name) {
      return { name: name, amount: totals[name] };
    });

    if (entries.length === 0) {
      categoryBreakdownEl.innerHTML = '';
      categoryBreakdownEl.appendChild(categoryEmptyEl);
      return;
    }

    entries.sort(function (a, b) { return b.amount - a.amount; });
    var max = entries[0].amount;

    categoryBreakdownEl.innerHTML = entries.map(function (entry) {
      var colorVar = CATEGORY_COLOR_VAR[entry.name] || '--cat-8';
      var pct = max > 0 ? Math.max((entry.amount / max) * 100, 3) : 0;
      return (
        '<div class="category-row">' +
          '<span class="category-name">' + escapeHtml(entry.name) + '</span>' +
          '<span class="category-bar-track">' +
            '<span class="category-bar-fill" style="width:' + pct.toFixed(1) + '%; background: var(' + colorVar + ');"></span>' +
          '</span>' +
          '<span class="category-amount">' + currencyFormatter.format(entry.amount) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderTable() {
    var rows = getFilteredTransactions();

    transactionCountEl.textContent = state.transactions.length
      ? (rows.length + ' of ' + state.transactions.length + ' transaction' + (state.transactions.length === 1 ? '' : 's'))
      : '';

    if (state.transactions.length === 0) {
      tbody.innerHTML = '';
      tableEmptyEl.style.display = 'block';
      tableEmptyEl.textContent = 'No transactions yet. Add your first one above.';
      return;
    }

    if (rows.length === 0) {
      tbody.innerHTML = '';
      tableEmptyEl.style.display = 'block';
      tableEmptyEl.textContent = 'No transactions match your search or filter.';
      return;
    }

    tableEmptyEl.style.display = 'none';

    tbody.innerHTML = rows.map(function (t) {
      var amountClass = t.type === 'income' ? 'amount-income' : 'amount-expense';
      var sign = t.type === 'income' ? '+' : '−';
      return (
        '<tr>' +
          '<td>' + formatDate(t.date) + '</td>' +
          '<td>' + escapeHtml(t.description) + '</td>' +
          '<td><span class="category-pill">' + escapeHtml(t.category) + '</span></td>' +
          '<td class="' + amountClass + '">' + sign + currencyFormatter.format(t.amount) + '</td>' +
          '<td><button type="button" class="delete-btn" data-id="' + t.id + '" aria-label="Delete transaction">✕</button></td>' +
        '</tr>'
      );
    }).join('');
  }

  function formatDate(iso) {
    var parts = iso.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateFormatter.format(d);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // -------- CSV export --------

  function exportCSV() {
    if (state.transactions.length === 0) return;

    var header = ['Date', 'Type', 'Description', 'Category', 'Amount'];
    var rows = state.transactions
      .slice()
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; })
      .map(function (t) {
        return [t.date, t.type, csvEscape(t.description), t.category, t.amount.toFixed(2)];
      });

    var csv = [header].concat(rows).map(function (row) { return row.join(','); }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = 'budget-transactions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function csvEscape(value) {
    var str = String(value);
    if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  document.addEventListener('DOMContentLoaded', init);
})();