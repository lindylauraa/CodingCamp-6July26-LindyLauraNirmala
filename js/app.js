
const Storage = (() => {
  const KEY = 'ebv_transactions';
  let _parseError = false;
  let _quotaError = false;

  function load() {
    _parseError = false;
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      _parseError = true;
      return [];
    }
  }

  function save(transactions) {
    _quotaError = false;
    try {
      localStorage.setItem(KEY, JSON.stringify(transactions));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        _quotaError = true;
      } else {
        throw e;
      }
    }
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  return {
    load,
    save,
    clear,
    get _parseError() { return _parseError; },
    set _parseError(v) { _parseError = v; },
    get _quotaError() { return _quotaError; },
    set _quotaError(v) { _quotaError = v; },
  };
})();

const State = (() => {
  let transactions = [];
  let filterMonth = null;
  let sortByCategory = false;

  function addTransaction(t) {
    transactions.push(t);
  }

  function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
  }

  function setFilterMonth(ym) {
    filterMonth = ym;
  }

  function setSortByCategory(flag) {
    sortByCategory = flag;
  }

  function getFiltered() {
    let result = transactions.slice();
    if (filterMonth) {
      const now = new Date();
      const todayStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const currentMonthStr = now.toLocaleDateString('id-ID', { month: '2-digit', year: 'numeric' });
      const currentYearStr = now.toLocaleDateString('id-ID', { year: 'numeric' });

      if (filterMonth === 'today') {
        result = result.filter(t => t.date === todayStr);
      } else if (filterMonth === 'this-month') {
        result = result.filter(t => t.date.slice(3) === currentMonthStr);
      } else if (filterMonth === 'this-year') {
        result = result.filter(t => t.date.slice(6) === currentYearStr);
      }
    }

    if (sortByCategory) {
      result = result.slice().sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.reverse();
    }

    return result;
  }

  function getBalance() {
    const sum = transactions.reduce((acc, t) => acc + t.amount, 0);
    return Math.round(sum * 100) / 100;
  }

  function getCategoryTotals() {
    return transactions.reduce((map, t) => {
      if (t.amount > 0) {
        map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
      }
      return map;
    }, new Map());
  }

  return {
    get transactions() { return transactions; },
    set transactions(arr) { transactions = arr; },
    get filterMonth() { return filterMonth; },
    get sortByCategory() { return sortByCategory; },

    addTransaction,
    deleteTransaction,
    setFilterMonth,
    setSortByCategory,
    getFiltered,
    getBalance,
    getCategoryTotals,
  };
})();

const Validator = (() => {
  function validateForm(name, amount, category) {
    const errors = {};

    const trimmedName = (name ?? '').trim();
    if (trimmedName.length === 0) {
      errors.name = 'Item name is required';
    } else if (trimmedName.length > 100) {
      errors.name = 'Item name must be 100 characters or fewer';
    }

    const trimmedAmount = (amount ?? '').trim();
    if (trimmedAmount.length === 0) {
      errors.amount = 'Amount is required';
    } else {
      const parsed = parseFloat(trimmedAmount);
      if (!isFinite(parsed) || parsed <= 0) {
        errors.amount = 'Amount must be a positive number';
      } else if (parsed > 999999999.99) {
        errors.amount = 'Amount exceeds the maximum allowed value';
      }
    }

    const trimmedCategory = (category ?? '').trim();
    if (trimmedCategory.length === 0) {
      errors.category = 'Category is required';
    }

    const valid = Object.keys(errors).length === 0;
    return { valid, errors };
  }

  return { validateForm };
})();

const Renderer = (() => {

  const getList        = () => document.getElementById('transaction-list');
  const getBalance     = () => document.getElementById('balance-display');
  const getBanner      = () => document.getElementById('error-banner');
  const getBannerMsg   = () => document.getElementById('error-message');
  const getDismiss     = () => document.getElementById('dismiss-banner');
  const getForm        = () => document.getElementById('transaction-form');

  const FIELD_ID_MAP = {
    name:     'name-input',
    amount:   'amount-input',
    category: 'category-select',
  };

  function renderTransactionList(transactions) {
    const list = getList();
    list.innerHTML = '';

    if (transactions.length === 0) {
      renderEmptyState(true);
      return;
    }

    renderEmptyState(false);

    const fragment = document.createDocumentFragment();
for (const t of transactions) {
      const li = document.createElement('li');
      li.className = 'transaction-item';
      li.dataset.id = t.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'transaction-name';
      nameSpan.textContent = t.name;

      const dateSpan = document.createElement('span');
      dateSpan.className = 'transaction-date';
      dateSpan.textContent = t.date; 

      const amountSpan = document.createElement('span');
      amountSpan.className = 'transaction-amount';
      amountSpan.textContent = `$${t.amount.toFixed(2)}`;

      const categorySpan = document.createElement('span');
      categorySpan.className = 'transaction-category';
      categorySpan.textContent = t.category;

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-delete';
      deleteBtn.dataset.id = t.id;
      deleteBtn.setAttribute('aria-label', `Delete ${t.name}`);
      deleteBtn.textContent = '✕';

      li.appendChild(nameSpan);
      li.appendChild(dateSpan); 
      li.appendChild(amountSpan);
      li.appendChild(categorySpan);
      li.appendChild(deleteBtn);
      fragment.appendChild(li);
    }
    list.appendChild(fragment);
  }


  function renderEmptyState(show) {
    const list = getList();

    const existing = list.querySelector('.empty-state');
    if (existing) {
      existing.remove();
    }
    if (show) {
      const li = document.createElement('li');
      li.className = 'empty-state';
      li.textContent = 'No transactions found for this period';
      list.appendChild(li);
    }
  }

  function renderBalance(total) {
    getBalance().textContent = `$${total.toFixed(2)}`;
  }


  function renderErrorBanner(message) {
    getBannerMsg().textContent = message;
    getBanner().removeAttribute('hidden');
  }

  let _dismissWired = false;
  function _wireDismiss() {
    if (_dismissWired) return;
    const btn = getDismiss();
    if (btn) {
      btn.addEventListener('click', () => {
        getBanner().setAttribute('hidden', '');
      });
      _dismissWired = true;
    }
  }

function showFieldErrors(errors) {
    for (const [key, message] of Object.entries(errors)) {
      const inputId = FIELD_ID_MAP[key];
      if (!inputId) continue;
      const input = document.getElementById(inputId);
      if (!input) continue;

      const errorId = `error-${key}`;

      input.setAttribute('aria-invalid', 'true');

      if (input.nextElementSibling && input.nextElementSibling.classList.contains('field-error')) {
        input.nextElementSibling.textContent = message;
        input.nextElementSibling.id = errorId;
      } else {
        const span = document.createElement('span');
        span.id = errorId;
        span.className = 'field-error';
        span.setAttribute('role', 'alert');
        span.textContent = message;
        input.insertAdjacentElement('afterend', span);
      }

      input.setAttribute('aria-describedby', errorId);
    }
  }

  function clearFieldErrors() {
    const form = getForm();
    if (!form) return;
    form.querySelectorAll('.field-error').forEach(el => {
      const errorId = el.id;
      if (errorId) {
        const input = form.querySelector(`[aria-describedby="${errorId}"]`);
        if (input) {
          input.removeAttribute('aria-describedby');
          input.removeAttribute('aria-invalid');
        }
      }
      el.remove();
    });
  }

  function resetForm() {
    const form = getForm();
    if (form) form.reset();
  }

  function _init() {
    _wireDismiss();
  }

  return {
    init: _init,
    renderTransactionList,
    renderEmptyState,
    renderBalance,
    renderErrorBanner,
    showFieldErrors,
    clearFieldErrors,
    resetForm,
  };
})();

const ChartManager = (() => {
  let chart = null;

  const PALETTE = [
    '#FCE4EC',
    '#F8BBD0',
    '#F48FB1', 
    '#F06292', 
    '#EC407A',
    '#E91E63',
    '#D81B60',
    '#C2185B',
    '#AD1457',
    '#880E4F'
  ];

  const categoryColorMap = new Map();

  function getColor(index) {
    return PALETTE[index % PALETTE.length];
  }

  const getNoDataEl = () => document.getElementById('chart-no-data');

  function _setNoDataVisible(visible) {
    const el = getNoDataEl();
    if (!el) return;
    if (visible) {
      el.removeAttribute('hidden');
    } else {
      el.setAttribute('hidden', '');
    }
  }

  function init(canvasElement) {
    if (typeof window.Chart === 'undefined') {
      console.warn('ChartManager: Chart.js is not available (CDN may have failed).');
      const fallback = document.getElementById('chart-fallback');
      if (fallback) {
        fallback.textContent = 'Chart could not be loaded.';
        fallback.removeAttribute('hidden');
      }
      return;
    }

    chart = new window.Chart(canvasElement, {
      type: 'pie',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
        }],
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const dataset = context.dataset.data;
                const total = dataset.reduce((sum, v) => sum + v, 0);
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return `${label}: ${pct}%`;
              },
            },
          },
          legend: {
            display: true,
            position: 'bottom',
          },
        },
      },
    });
  }

  function update(categoryTotals) {
    if (!chart) return;

    const filtered = [];
    for (const [category, total] of categoryTotals) {
      if (total > 0) {
        filtered.push({ category, total });
      }
    }

    const labels = [];
    const data = [];
    const colors = [];

    for (const entry of filtered) {
      labels.push(entry.category);
      data.push(entry.total);

      if (!categoryColorMap.has(entry.category)) {
        categoryColorMap.set(entry.category, getColor(categoryColorMap.size));
      }
      colors.push(categoryColorMap.get(entry.category));
    }

    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();

    _setNoDataVisible(filtered.length === 0);
  }

  function showPlaceholder() {
    if (!chart) return;
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.data.datasets[0].backgroundColor = [];
    chart.update();
    _setNoDataVisible(true);
  }

  return {
    init,
    update,
    showPlaceholder,
    getColor,
  };
})();

const EventHandlers = (() => {

  function _handleFormSubmit(event) {
    event.preventDefault();
    Renderer.clearFieldErrors();

    const nameInput = document.getElementById('name-input');
    const amountInput = document.getElementById('amount-input');
    const select = document.getElementById('category-select');
    const customInput = document.getElementById('custom-category-input');

    let name = nameInput.value;
    let amount = amountInput.value;
    let category = select.value;
    const customCategory = customInput.value.trim();

    if (customCategory && customCategory.length <= 50) {
      const alreadyExists = Array.from(select.options).some(opt => opt.value === customCategory);
      if (!alreadyExists) {
        const option = document.createElement('option');
        option.value = customCategory;
        option.textContent = customCategory;
        select.appendChild(option);
      }
      select.value = customCategory;
      category = customCategory; 
    }

    const { valid, errors } = Validator.validateForm(name, amount, category);

    if (!valid) {
      Renderer.showFieldErrors(errors);
      return;
    }

    const t = {
      id:       crypto.randomUUID?.() ?? Date.now().toString(),
      name:     name.trim(),
      amount:   parseFloat(amount),
      category: category.trim(),
      date:     new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    };

    State.addTransaction(t);
    Storage.save(State.transactions);

    if (Storage._quotaError) {
      State.deleteTransaction(t.id);
      Renderer.renderErrorBanner('Storage is full. Your transaction could not be saved.');
    } else {
      Renderer.renderTransactionList(State.getFiltered());
      Renderer.renderBalance(State.getBalance());
      ChartManager.update(State.getCategoryTotals());
      Renderer.resetForm();
    }
  }

 function _handleListClick(event) {
    if (!event.target.classList.contains('btn-delete')) {
      return; 
    }

    const id = event.target.dataset.id;
    if (!id) return;

    State.deleteTransaction(id);
    Storage.save(State.transactions);
    Renderer.renderTransactionList(State.getFiltered());
    Renderer.renderBalance(State.getBalance());

    if (State.getCategoryTotals().size > 0) {
      ChartManager.update(State.getCategoryTotals());
    } else {
      ChartManager.showPlaceholder();
    }
  }

  function _handleMonthFilterChange(event) {
    State.setFilterMonth(event.target.value || null);
    Renderer.renderTransactionList(State.getFiltered());
  }

  function _handleSortSelectChange(event) {
    State.setSortByCategory(event.target.value === 'category');
    Renderer.renderTransactionList(State.getFiltered());
  }

  function _handleCustomCategoryChange(event) {
    const value = event.target.value.trim();
    if (!value || value.length > 50) return;

    const select = document.getElementById('category-select');
    const alreadyExists = Array.from(select.options).some(opt => opt.value === value);

    if (!alreadyExists) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    }

    select.value = value;
  }

  function init() {
    Renderer.init();
    const loaded = Storage.load();

    if (Storage._parseError) {
      Renderer.renderErrorBanner('Saved data could not be loaded and has been reset.');
    }

    State.transactions = loaded;

    ChartManager.init(document.querySelector('#expense-chart'));

    Renderer.renderTransactionList(State.getFiltered());
    Renderer.renderBalance(State.getBalance());

    if (State.getCategoryTotals().size > 0) {
      ChartManager.update(State.getCategoryTotals());
    } else {
      ChartManager.showPlaceholder();
    }

  
    const select = document.getElementById('category-select');
    const existingValues = new Set(Array.from(select.options).map(opt => opt.value));


    const seen = new Set();
    for (const t of loaded) {
      const cat = t.category;
      if (cat && !seen.has(cat) && !existingValues.has(cat)) {
        seen.add(cat);
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
      }
      seen.add(cat);
    }

    document.getElementById('transaction-form')
      .addEventListener('submit', _handleFormSubmit);

    document.getElementById('transaction-list')
      .addEventListener('click', _handleListClick);

    document.getElementById('filter')
      .addEventListener('change', _handleMonthFilterChange);

    document.getElementById('sort-select')
      .addEventListener('change', _handleSortSelectChange);

    document.getElementById('custom-category-input')
      .addEventListener('change', _handleCustomCategoryChange);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => { EventHandlers.init(); });
