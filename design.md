# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a fully client-side single-page web application built with HTML, CSS, and Vanilla JavaScript. It allows users to record personal expense transactions, view them in a filterable and sortable list, track a running total balance, and visualize spending by category through a live-updating pie chart. All data is persisted in the browser's `localStorage` — no server, build step, or framework is required.

The application ships as three files:

```
index.html
css/styles.css
js/app.js
```

Chart rendering is handled by [Chart.js](https://www.chartjs.org/) loaded via a CDN `<script>` tag (no npm, no bundler).

### Key Design Decisions

- **Single JS file, single CSS file**: All logic lives in `js/app.js` and all styles in `css/styles.css`, satisfying the hard constraints in Requirements 6.2.
- **No framework**: The UI is built with plain DOM APIs (`document.createElement`, `querySelector`, event listeners). No React, Vue, or Angular.
- **Chart.js for the pie chart**: Chart.js is the most widely adopted charting library for Vanilla JS and ships as a self-contained UMD bundle. It supports pie/doughnut charts, custom colors, and in-place dataset updates without redrawing.
- **Module-like structure via IIFE/module pattern**: Although there is only one JS file, the code is organized into clearly separated responsibility blocks (Storage, State, Validator, Renderer, ChartManager, EventHandlers) using an IIFE or ES module syntax (`type="module"` on the `<script>` tag) to avoid polluting global scope.
- **localStorage as the single source of truth**: All reads and writes go through a dedicated `Storage` layer. The in-memory state is always derived from (and synchronized with) localStorage.

---

## Architecture

The application follows a simple unidirectional data flow:

```
User Action
    │
    ▼
EventHandler  ──►  Validator  ──►  (reject with inline error)
    │
    ▼
State Mutation  (add/delete transaction in memory)
    │
    ▼
Storage Layer  (write to / delete from localStorage)
    │
    ▼
Renderer  (re-render Transaction_List, Balance_Display)
    │
    ▼
ChartManager  (update Chart.js dataset)
```

There is no reactive framework; after each state mutation the renderer and chart manager are called synchronously. Because all mutations happen in the same call stack, the 100ms update SLA from Requirements 3.2, 3.3, 4.2, and 4.3 is met in practice (DOM updates are synchronous; Chart.js `.update()` triggers a single animation frame).

### Component Map

```
index.html
├── <header>              Balance_Display
├── <main>
│   ├── <section id="form-section">    Input_Form
│   ├── <section id="controls-section"> Month filter + Sort control
│   ├── <section id="list-section">    Transaction_List
│   └── <section id="chart-section">  Chart (canvas)
└── <footer>              (optional credits / dismiss banner anchor)
```

---

## Components and Interfaces

### 1. Storage Module

Responsible for all `localStorage` interaction. Transactions are stored as a single JSON array under the key `"ebv_transactions"`.

```
Storage.load()  → Transaction[]
Storage.save(transactions: Transaction[])  → void
Storage.clear()  → void
```

- `load()` calls `JSON.parse(localStorage.getItem("ebv_transactions"))`. If the item is missing or parse throws, it catches the error, triggers the malformed-data banner (Requirement 5.5), and returns `[]`.
- `save()` calls `JSON.stringify` then `localStorage.setItem`. It always serializes the full array (not individual items), so there is no partial-write risk.

### 2. State Module

Holds the in-memory canonical list of transactions and the current UI filter/sort state.

```
State.transactions: Transaction[]     // all transactions (all time)
State.filterMonth: string | null      // "YYYY-MM" or null (show all)
State.sortByCategory: boolean
```

State is never mutated directly from outside; all mutations go through named operations:

```
State.addTransaction(t: Transaction)   → void
State.deleteTransaction(id: string)    → void
State.setFilterMonth(ym: string|null)  → void
State.setSortByCategory(flag: boolean) → void
State.getFiltered()                    → Transaction[]
State.getBalance()                     → number
State.getCategoryTotals()              → Map<string, number>
```

### 3. Validator Module

Pure functions — no DOM side effects. Returns a result object.

```
Validator.validateForm(name: string, amount: string, category: string)
  → { valid: boolean, errors: { name?: string, amount?: string, category?: string } }
```

Rules enforced:
- `name` must be non-empty and ≤ 100 characters.
- `amount` must parse as a finite positive number ≤ 999,999,999.99.
- `category` must be non-empty.

### 4. Renderer Module

Responsible for all DOM updates. Called after every state change.

```
Renderer.renderTransactionList(transactions: Transaction[])  → void
Renderer.renderBalance(total: number)                        → void
Renderer.renderEmptyState(show: boolean)                     → void
Renderer.renderErrorBanner(message: string)                  → void
Renderer.showFieldErrors(errors: object)                     → void
Renderer.clearFieldErrors()                                  → void
Renderer.resetForm()                                         → void
```

`renderTransactionList` creates one `<li>` per transaction. Each `<li>` contains:
- A `<span>` for truncated item name (max 100 chars, enforced by CSS `text-overflow: ellipsis`).
- A `<span>` for amount formatted with `toFixed(2)`.
- A `<span>` for category.
- A `<button>` delete control with `aria-label="Delete [name]"`.

### 5. ChartManager Module

Wraps the Chart.js instance.

```
ChartManager.init(canvasElement: HTMLCanvasElement)  → void
ChartManager.update(categoryTotals: Map<string, number>)  → void
ChartManager.showPlaceholder()  → void
```

`ChartManager.update()` takes the current `categoryTotals` map, computes labels, data values, and percentage strings for the tooltip, then calls `chart.data.datasets[0].data = [...]` followed by `chart.update()`. It also filters out zero/negative-amount categories before passing data to Chart.js (Requirement 4.6).

Color assignment is handled by a deterministic `getColor(index: number)` helper that returns colors from a pre-defined palette of 20 distinct hues. Index is assigned by insertion order of new categories so that a category always gets the same color within a session. Colors are stored in a `Map<string, string>` keyed by category name so they are stable across updates.

### 6. EventHandlers Module

Wires up all event listeners on `DOMContentLoaded`.

| Event | Target | Handler |
|---|---|---|
| `submit` | `#transaction-form` | Validate → add transaction → save → render → chart update |
| `change` | `#month-filter` | Update filter month → re-render list |
| `change` | `#sort-select` | Toggle sort → re-render list |
| `click` (delegated) | `#transaction-list` | Delete transaction → save → render → chart update |
| `click` | `#dismiss-banner` | Hide error banner |
| `change` | `#custom-category-input` | Add custom category to dropdown |

---

## Data Models

### Transaction

```js
{
  id: string,           // crypto.randomUUID() or Date.now().toString() fallback
  name: string,         // 1–100 characters
  amount: number,       // positive finite number, ≤ 999,999,999.99
  category: string,     // 1–50 characters
  date: string          // ISO 8601 date string: "YYYY-MM-DD"
}
```

The `date` field is set to `new Date().toISOString().slice(0, 10)` at submission time (local date). Monthly filtering compares `transaction.date.slice(0, 7)` (the `"YYYY-MM"` portion) against the selected filter value.

### LocalStorage Schema

```
Key:   "ebv_transactions"
Value: JSON.stringify(Transaction[])
```

A single key holds the entire array. On every add or delete the full array is re-serialized and written back. For the expected data volume (hundreds of transactions), this is performant and avoids stale-key management.

### Custom Categories

Custom categories are not persisted separately. They are derived from the unique `category` values present in the stored transactions. On load, the category dropdown is populated with the three defaults plus any unique categories found in stored transactions (deduplicated, sorted A–Z after the defaults).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction submission round-trip

*For any* valid transaction (non-empty name ≤ 100 chars, positive amount ≤ 999,999,999.99, non-empty category), submitting the form should result in the transaction appearing in the Transaction_List DOM and being recoverable by deserializing the `"ebv_transactions"` key from `localStorage`, with no data loss for any field.

**Validates: Requirements 1.4, 5.1**

### Property 2: Invalid form inputs are always rejected

*For any* combination of form field values where at least one field is empty, zero, negative, non-numeric, or exceeds its maximum, the Validator should return `valid: false` and produce at least one error entry, and the transaction list should remain unchanged.

**Validates: Requirements 1.5, 1.6, 1.7**

### Property 3: Balance equals sum of all transaction amounts

*For any* list of transactions, the value displayed in `Balance_Display` should equal the arithmetic sum of all `amount` fields, rounded to 2 decimal places using standard rounding. This holds after every add, delete, and page load.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

### Property 4: Month filter excludes out-of-range transactions

*For any* set of transactions with arbitrary dates, and any selected `"YYYY-MM"` filter value, the Transaction_List should contain exactly those transactions whose `date.slice(0,7)` matches the filter, and no transactions from any other month or year.

**Validates: Requirements 2.3**

### Property 5: Category sort produces non-decreasing alphabetical order

*For any* list of transactions with arbitrary category names, after applying the category sort option, the sequence of category values in the rendered Transaction_List should be non-decreasing in lexicographic (A–Z) order.

**Validates: Requirements 2.4**

### Property 6: Deletion removes from list and storage

*For any* transaction that has been added, deleting it by its `id` should result in the transaction being absent from both the in-memory state and the deserialized `localStorage` array. All other transactions should remain present and unmodified.

**Validates: Requirements 2.5, 5.2**

### Property 7: Chart category totals match transaction data

*For any* set of transactions with positive amounts, the category totals passed to the Chart.js dataset should equal the sum of amounts for each category, and the percentage label for each category should equal `(categoryTotal / grandTotal * 100)` rounded to 1 decimal place. Transactions with zero or negative amounts must be excluded.

**Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6**

### Property 8: Category colors are distinct

*For any* set of 1–20 distinct category names, the color assignment function should return a unique color for each category (no two categories share the same color value in the dataset passed to Chart.js).

**Validates: Requirements 4.5**

### Property 9: LocalStorage round-trip preserves all transaction fields

*For any* array of transactions, serializing to JSON and deserializing back should produce an array where every transaction has identical `id`, `name`, `amount`, `category`, and `date` values to the originals (no field truncation, type coercion, or data loss).

**Validates: Requirements 5.1, 5.3**

### Property 10: Malformed localStorage data is handled gracefully

*For any* string in `localStorage["ebv_transactions"]` that is not valid parseable JSON representing a transaction array, loading the app should result in an empty transaction list, a balance of 0.00, a placeholder chart state, and a visible error indication — not a thrown exception or broken UI.

**Validates: Requirements 5.5**

### Property 11: Responsive layout — no horizontal overflow

*For any* viewport width in the range [320, 1920] pixels, `document.body.scrollWidth` should not exceed `window.innerWidth` (no horizontal scroll), and no interactive form element should have a computed right edge beyond the viewport width.

**Validates: Requirements 6.1, 6.6**

---

## Error Handling

### Form Validation Errors

Inline error messages are injected as `<span class="field-error" role="alert">` elements immediately after each offending input. They are cleared on the next valid submission or when the user begins editing the field. Using `role="alert"` ensures screen readers announce the error without requiring focus to move.

### localStorage Parse Errors

If `JSON.parse` throws in `Storage.load()`, the error is caught, the raw value is discarded, and a dismissible banner `<div id="error-banner" role="alert">` is shown at the top of the page with a message like "Saved data could not be loaded and has been reset." The banner has a close button. The app continues in a clean empty state.

### localStorage Quota Exceeded

If `localStorage.setItem` throws a `QuotaExceededError`, the add operation is rolled back from in-memory state and a banner message informs the user that storage is full. The Transaction_List is not updated for that failed transaction.

### Chart Initialization Failure

If `Chart` is not defined (CDN load failed), `ChartManager.init()` logs a console warning and renders a `<p>` fallback message inside `#chart-section` stating "Chart could not be loaded." The rest of the app remains functional.

### Invalid Transaction IDs on Delete

If a delete event fires with an ID that does not exist in state (e.g., rapid double-click), the operation is a no-op. No error is shown; state and storage are unchanged.

---

## Testing Strategy

### Unit Tests (example-based)

Focused on the pure logic modules: `Validator`, `Storage`, and `State`.

- **Validator**: Test all combinations of empty/invalid inputs to confirm error messages are produced. Test boundary values: amount = 0, amount = -1, amount = 999999999.99, amount = 1000000000, name at exactly 100 and 101 chars, category at exactly 50 and 51 chars.
- **State.getBalance()**: Test with 0, 1, and many transactions including floating-point amounts that are prone to rounding errors.
- **State.getFiltered()**: Test with multiple months, verify correct subset is returned.
- **State.getCategoryTotals()**: Test with overlapping categories, verify totals are summed correctly.
- **Storage.load()**: Test with valid JSON, missing key (null), and malformed strings.
- **ChartManager color assignment**: Test that `getColor(index)` returns the same value for the same index and that 20 distinct indices produce 20 distinct values.

### Property-Based Tests

Property-based testing is appropriate here because the core logic — balance computation, filtering, sorting, serialization, validation, and chart data aggregation — consists of pure functions whose correctness must hold for all valid inputs, not just hand-picked examples.

**Recommended library**: [fast-check](https://github.com/dubzzz/fast-check) (works in plain JavaScript, no bundler needed for tests run via Node.js).

Each property test runs a minimum of **100 iterations** with randomly generated inputs.

| Property | Test Description |
|---|---|
| Property 1 | Generate random valid transactions; add each; verify localStorage deserialization round-trip |
| Property 2 | Generate all combinations of invalid field values; verify `Validator.validateForm` returns `valid: false` |
| Property 3 | Generate random arrays of positive amounts; verify `State.getBalance()` equals `sum(amounts)` rounded to 2dp |
| Property 4 | Generate random transaction arrays with random dates; filter by random month; verify subset correctness |
| Property 5 | Generate random transaction arrays; sort; verify category sequence is non-decreasing |
| Property 6 | Add then delete a random transaction; verify absence from state and localStorage |
| Property 7 | Generate random positive-amount transaction sets; verify chart totals and percentages |
| Property 8 | Generate random sets of 1–20 category names; verify all colors are distinct |
| Property 9 | Generate random transaction arrays; serialize → deserialize; verify field-level equality |
| Property 10 | Generate random malformed JSON strings; verify `Storage.load()` returns `[]` and sets error flag |
| Property 11 | Programmatically resize viewport in jsdom; verify no horizontal overflow |

**Tag format for each test:**

```js
// Feature: expense-budget-visualizer, Property 3: Balance equals sum of all transaction amounts
```

### Integration / Smoke Tests

- Verify `index.html` links exactly one CSS file and one JS file.
- Verify Chart.js CDN URL resolves (network smoke test, optional CI gate).
- Verify the app loads without JS errors in Chrome, Firefox, Edge, and Safari using a headless browser run.

### Accessibility Checks

- Run [axe-core](https://github.com/dequelabs/axe-core) in a headless browser against `index.html` with sample data loaded.
- Manually verify keyboard navigation: Tab through all form fields, submit with Enter, delete with Enter/Space on the delete button.

### Visual / Responsive Checks

- Snapshot-test the rendered HTML at 320px, 768px, and 1440px widths.
- Visually confirm chart renders correctly with 1, 3, and 20 categories.
