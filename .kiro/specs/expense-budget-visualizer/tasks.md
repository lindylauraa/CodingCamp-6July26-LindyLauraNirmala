# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a fully client-side expense tracker in three files (`index.html`, `css/styles.css`, `js/app.js`) with no build tools or framework. The JavaScript is organized into six modules (Storage, State, Validator, Renderer, ChartManager, EventHandlers) inside an ES module. Chart.js is loaded via CDN. All data is persisted in `localStorage` under the key `"ebv_transactions"`.

---

## Tasks

- [x] 1. Scaffold project structure and HTML shell
  - [x] 1.1 Create `index.html` with semantic layout
    - Add `<header>` for `Balance_Display`, `<main>` containing four `<section>` elements: `#form-section`, `#controls-section`, `#list-section`, `#chart-section`
    - Include Chart.js CDN `<script>` tag before `</body>` and `<script type="module" src="js/app.js"></script>` after it
    - Link `css/styles.css` in `<head>`
    - Add `<div id="error-banner" role="alert" hidden>` with a `#dismiss-banner` close button inside `<header>`
    - Add `<canvas id="expense-chart">` inside `#chart-section` and a `<p id="chart-fallback" hidden>` fallback paragraph
    - Add `<form id="transaction-form">` with fields: `#name-input` (text, maxlength=100), `#amount-input` (number), `#category-select` (dropdown with Food / Transport / Fun), `#custom-category-input` (text, maxlength=50), and a submit button
    - Add `<select id="month-filter">` and `<select id="sort-select">` inside `#controls-section`
    - Add `<ul id="transaction-list">` inside `#list-section`
    - Add `<div id="balance-display">` inside `<header>`
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 6.2_

  - [x] 1.2 Create `css/styles.css` with base layout and reset
    - CSS reset / box-sizing; root CSS custom properties for the color palette
    - Flexbox/Grid layout for the main sections; default two-column desktop layout
    - Responsive breakpoint: `@media (max-width: 599px)` switches to single-column
    - Scrollable `#transaction-list` with `overflow-y: auto` and a fixed max-height
    - `text-overflow: ellipsis` on transaction name spans
    - Visible focus indicator: `outline: 2px solid` with a color that meets 3:1 contrast ratio
    - `#error-banner` styled as a dismissible top-of-page alert strip
    - `.field-error` styled in a color meeting 4.5:1 contrast on the form background
    - _Requirements: 2.2, 6.1, 6.3, 6.4, 6.6_

  - [x] 1.3 Create `js/app.js` as a module skeleton
    - Open with `// js/app.js` comment; define six empty IIFE-style const blocks: `Storage`, `State`, `Validator`, `Renderer`, `ChartManager`, `EventHandlers`
    - Add `document.addEventListener('DOMContentLoaded', () => { EventHandlers.init(); });` at the bottom
    - _Requirements: 6.2_

- [x] 2. Implement the Storage module
  - [x] 2.1 Implement `Storage.load()`, `Storage.save()`, and `Storage.clear()`
    - `load()`: `JSON.parse(localStorage.getItem("ebv_transactions"))`; on missing key return `[]`; on parse error set an internal `Storage._parseError = true` flag and return `[]`
    - `save(transactions)`: `localStorage.setItem("ebv_transactions", JSON.stringify(transactions))`; wrap in try/catch for `QuotaExceededError`; on quota error set `Storage._quotaError = true` and do NOT update storage
    - `clear()`: `localStorage.removeItem("ebv_transactions")`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.2 Write property test for Storage round-trip (Property 9)
    - **Property 9: LocalStorage round-trip preserves all transaction fields**
    - Generate random arrays of transaction objects with `fast-check`; call `Storage.save(arr)` then `Storage.load()`; assert every field (`id`, `name`, `amount`, `category`, `date`) is identical to the original
    - **Validates: Requirements 5.1, 5.3**

  - [ ]* 2.3 Write property test for malformed localStorage (Property 10)
    - **Property 10: Malformed localStorage data is handled gracefully**
    - Generate random non-JSON strings and put them in `localStorage["ebv_transactions"]` directly; call `Storage.load()`; assert return value is `[]` and `Storage._parseError` is `true`; assert no exception is thrown
    - **Validates: Requirements 5.5**

- [x] 3. Implement the Validator module
  - [x] 3.1 Implement `Validator.validateForm(name, amount, category)`
    - Return `{ valid: true, errors: {} }` when all fields pass; otherwise `{ valid: false, errors: { name?, amount?, category? } }`
    - `name`: non-empty and length ≤ 100; error: `"Item name is required"` / `"Item name must be 100 characters or fewer"`
    - `amount`: `parseFloat` must be finite, > 0, and ≤ 999,999,999.99; error: `"Amount is required"` / `"Amount must be a positive number"` / `"Amount exceeds the maximum allowed value"`
    - `category`: non-empty; error: `"Category is required"`
    - _Requirements: 1.5, 1.6, 1.7_

  - [ ]* 3.2 Write property test for invalid form inputs (Property 2)
    - **Property 2: Invalid form inputs are always rejected**
    - Generate all combinations of blank, zero, negative, non-numeric, and over-max values for any subset of fields; call `Validator.validateForm`; assert `valid === false` and at least one error key is present
    - **Validates: Requirements 1.5, 1.6, 1.7**

- [x] 4. Implement the State module
  - [x] 4.1 Implement `State` data properties and mutation methods
    - Properties: `transactions: []`, `filterMonth: null`, `sortByCategory: false`
    - `addTransaction(t)`: push to `transactions`
    - `deleteTransaction(id)`: filter out by id (no-op if not found)
    - `setFilterMonth(ym)`: assign to `filterMonth`
    - `setSortByCategory(flag)`: assign to `sortByCategory`
    - _Requirements: 1.4, 2.5_

  - [x] 4.2 Implement `State.getFiltered()`, `State.getBalance()`, `State.getCategoryTotals()`
    - `getFiltered()`: filter `transactions` by `filterMonth` (compare `t.date.slice(0,7)`), then sort by category A–Z if `sortByCategory` is true
    - `getBalance()`: sum all `transactions` amounts (not filtered), round to 2 dp with `Math.round(sum * 100) / 100`
    - `getCategoryTotals()`: reduce all transactions with positive amounts into a `Map<string, number>` of category → sum
    - _Requirements: 2.3, 2.4, 3.4, 4.1, 4.6_

  - [ ]* 4.3 Write property test for balance computation (Property 3)
    - **Property 3: Balance equals sum of all transaction amounts**
    - Generate random arrays of positive floating-point amounts; load into State; assert `State.getBalance()` equals `Math.round(sum * 100) / 100`
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**

  - [ ]* 4.4 Write property test for month filter (Property 4)
    - **Property 4: Month filter excludes out-of-range transactions**
    - Generate random transaction arrays with arbitrary ISO dates and a random `"YYYY-MM"` filter; assert `State.getFiltered()` contains exactly those transactions whose `date.slice(0,7)` matches the filter
    - **Validates: Requirements 2.3**

  - [ ]* 4.5 Write property test for category sort (Property 5)
    - **Property 5: Category sort produces non-decreasing alphabetical order**
    - Generate random transaction arrays; set `sortByCategory = true`; assert the category sequence in `getFiltered()` is lexicographically non-decreasing
    - **Validates: Requirements 2.4**

- [x] 5. Checkpoint — Verify pure logic modules
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the Renderer module
  - [x] 6.1 Implement `Renderer.renderTransactionList(transactions)` and `Renderer.renderEmptyState(show)`
    - Clear `#transaction-list`; if `transactions` is empty call `renderEmptyState(true)` and return
    - For each transaction create an `<li>` with: name `<span>` (CSS handles truncation), amount `<span>` (`.toFixed(2)`), category `<span>`, and a `<button>` with `data-id` attribute and `aria-label="Delete [name]"`
    - `renderEmptyState(true)`: append a single `<li class="empty-state">No transactions for this month</li>`; `renderEmptyState(false)`: remove any such element
    - _Requirements: 2.1, 2.2, 2.6_

  - [x] 6.2 Implement `Renderer.renderBalance(total)`, `Renderer.renderErrorBanner(message)`, and banner dismiss
    - `renderBalance(total)`: set `#balance-display` text content to `$${total.toFixed(2)}`
    - `renderErrorBanner(message)`: set banner text and remove `hidden` attribute
    - Wire dismiss: `#dismiss-banner` click adds `hidden` attribute back
    - _Requirements: 3.1, 3.4, 5.5_

  - [x] 6.3 Implement `Renderer.showFieldErrors(errors)` and `Renderer.clearFieldErrors()` and `Renderer.resetForm()`
    - `showFieldErrors(errors)`: for each key in errors, find the corresponding input, insert a `<span class="field-error" role="alert">` immediately after it with the error message text
    - `clearFieldErrors()`: remove all `.field-error` elements from the form
    - `resetForm()`: call `form.reset()`
    - _Requirements: 1.5, 1.6, 1.7_

- [x] 7. Implement the ChartManager module
  - [ ] 7.1 Implement `ChartManager.init(canvasElement)` with CDN failure fallback
    - Check if `window.Chart` is defined; if not, show `#chart-fallback` paragraph and return without creating a Chart instance
    - If Chart.js is available, create a new `Chart(canvas, { type: 'pie', ... })` with empty initial data and configure `tooltips` / `plugins` to display percentage labels
    - _Requirements: 4.1, 4.4_

  - [x] 7.2 Implement `ChartManager.update(categoryTotals)` and `ChartManager.showPlaceholder()`
    - `update(categoryTotals)`: filter out zero/negative entries from the map; compute labels, data values, percentages (rounded to 1 dp); assign colors via `getColor(index)` from a 20-color palette stored in a `Map<string, string>`; update `chart.data.labels`, `chart.data.datasets[0].data`, `chart.data.datasets[0].backgroundColor`; call `chart.update()`
    - `showPlaceholder()`: set chart data to empty arrays and call `chart.update()`; show a "No data available" overlay or use Chart.js `plugins.emptyDoughnut` pattern
    - Implement `getColor(index)` returning a distinct hex color for indices 0–19
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 7.3 Write property test for category color distinctness (Property 8)
    - **Property 8: Category colors are distinct**
    - Generate sets of 1–20 random category names; call `getColor` for each index; assert all returned color strings are unique within the set
    - **Validates: Requirements 4.5**

  - [ ]* 7.4 Write property test for chart category totals (Property 7)
    - **Property 7: Chart category totals match transaction data**
    - Generate random positive-amount transaction arrays; compute `getCategoryTotals()` manually; compare against what `ChartManager.update()` would receive; assert totals and percentages match
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6**

- [x] 8. Implement the EventHandlers module and wire everything together
  - [x] 8.1 Implement `EventHandlers.init()` — form submit handler
    - On `#transaction-form` submit: call `Renderer.clearFieldErrors()`; call `Validator.validateForm`; if invalid call `Renderer.showFieldErrors(errors)` and return
    - If valid: build transaction object `{ id: crypto.randomUUID?.() ?? Date.now().toString(), name, amount: parseFloat(amount), category, date: new Date().toISOString().slice(0,10) }`; call `State.addTransaction(t)`, `Storage.save(State.transactions)`; on `Storage._quotaError` rollback `State.deleteTransaction(t.id)` and show quota banner; else call `Renderer.renderTransactionList(State.getFiltered())`, `Renderer.renderBalance(State.getBalance())`, `ChartManager.update(State.getCategoryTotals())`, `Renderer.resetForm()`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 3.2, 4.2, 5.1_

  - [x] 8.2 Implement delegated delete handler on `#transaction-list`
    - Listen for `click` on `#transaction-list`; if `event.target` has `data-id`, call `State.deleteTransaction(id)`, `Storage.save(State.transactions)`, `Renderer.renderTransactionList(State.getFiltered())`, `Renderer.renderBalance(State.getBalance())`, `ChartManager.update(State.getCategoryTotals())`; if totals map is empty call `ChartManager.showPlaceholder()` instead
    - _Requirements: 2.5, 3.3, 4.3, 5.2_

  - [x] 8.3 Implement filter/sort change handlers and custom category input
    - `#month-filter` change: `State.setFilterMonth(value || null)`; re-render list
    - `#sort-select` change: `State.setSortByCategory(value === 'category')`; re-render list
    - `#custom-category-input` change: if non-empty and ≤ 50 chars, add `<option>` to `#category-select` if not already present; set `#category-select` value to the new option
    - _Requirements: 1.3, 2.3, 2.4_

  - [x] 8.4 Implement `EventHandlers.init()` — app bootstrap (on DOMContentLoaded)
    - Call `Storage.load()` to get initial transactions; if `Storage._parseError` call `Renderer.renderErrorBanner(...)`
    - Set `State.transactions` to loaded array
    - Call `ChartManager.init(document.querySelector('#expense-chart'))`
    - Call `Renderer.renderTransactionList(State.getFiltered())`, `Renderer.renderBalance(State.getBalance())`
    - If `State.getCategoryTotals().size > 0` call `ChartManager.update(...)` else call `ChartManager.showPlaceholder()`
    - Populate `#category-select` with default options + unique categories from loaded transactions
    - _Requirements: 2.1, 3.5, 4.4, 5.3, 5.4, 5.5_

  - [ ]* 8.5 Write property test for transaction submission round-trip (Property 1)
    - **Property 1: Transaction submission round-trip**
    - Generate random valid transaction inputs; simulate form submission through `EventHandlers`; verify the transaction appears in `State.transactions` and in `Storage.load()` with all fields intact
    - **Validates: Requirements 1.4, 5.1**

  - [ ]* 8.6 Write property test for deletion from state and storage (Property 6)
    - **Property 6: Deletion removes from list and storage**
    - Add a random transaction; delete it by id; assert it is absent from `State.transactions` and from `Storage.load()`; assert all other transactions remain unchanged
    - **Validates: Requirements 2.5, 5.2**

- [x] 9. Checkpoint — Verify end-to-end integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Accessibility and responsive polish
  - [x] 10.1 Audit and fix keyboard accessibility and ARIA
    - Verify `aria-label` on all delete buttons matches the transaction name
    - Verify `role="alert"` on `#error-banner` and all `.field-error` spans
    - Verify Tab order flows logically through form → controls → list
    - Add `aria-live="polite"` to `#balance-display` so screen readers announce updates
    - _Requirements: 6.4_

  - [-] 10.2 Verify and fix contrast ratios and focus indicators in `css/styles.css`
    - Check that all body/label text colors meet 4.5:1 contrast against their backgrounds
    - Check that large text (≥ 18pt or ≥ 14pt bold) meets 3:1 contrast
    - Confirm focus outline color meets 3:1 against adjacent background for all interactive elements
    - _Requirements: 6.3, 6.4_

  - [x] 10.3 Verify responsive layout at 320px, 600px, and 1920px
    - Open `index.html` in a browser and resize; confirm no horizontal scroll at 320px
    - Confirm single-column layout is active below 600px with no overlapping elements
    - Confirm two-column or wider layout is functional at 1920px
    - _Requirements: 6.1, 6.6_

- [ ] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. The property-based tests require [fast-check](https://github.com/dubzzz/fast-check) and a Node.js test runner (e.g. Vitest or Jest). They test pure logic modules in isolation and do not require a browser.
- Tasks 10.3 involves manual browser inspection, but tasks 10.1 and 10.2 can be validated with axe-core in a headless browser.
- The three-file constraint (`index.html`, `css/styles.css`, `js/app.js`) is a hard requirement — no additional files may be created for production code.
- Chart.js CDN failure must always be handled silently (console warning only) with the fallback paragraph shown.
- `crypto.randomUUID()` may not be available in very old browsers; the `Date.now().toString()` fallback ensures compatibility.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "4.2"] },
    { "id": 3, "tasks": ["4.3", "4.4", "4.5", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 5, "tasks": ["7.2"] },
    { "id": 6, "tasks": ["7.3", "7.4", "8.1"] },
    { "id": 7, "tasks": ["8.2", "8.3"] },
    { "id": 8, "tasks": ["8.4"] },
    { "id": 9, "tasks": ["8.5", "8.6"] },
    { "id": 10, "tasks": ["10.1", "10.2", "10.3"] }
  ]
}
```
