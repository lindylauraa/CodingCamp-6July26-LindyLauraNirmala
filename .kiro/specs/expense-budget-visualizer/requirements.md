# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, categorize spending, and visualize budget data through an interactive pie chart. Built with HTML, CSS, and Vanilla JavaScript, it requires no backend or complex setup and stores all data in the browser's LocalStorage. The app supports a monthly summary view, real-time balance updates, and category-based filtering.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense record consisting of an item name, a monetary amount, and a category.
- **Category**: A label assigned to a transaction. Default categories are Food, Transport, and Fun. Users may also define custom categories.
- **Transaction_List**: The scrollable UI component that displays all recorded transactions for the selected month.
- **Balance_Display**: The UI component shown at the top of the page that presents the running total of all transaction amounts.
- **Input_Form**: The UI component containing fields for item name, amount, and category, plus a submit button.
- **Chart**: The pie chart visualization rendered using Chart.js that shows spending breakdown by category.
- **LocalStorage**: The browser's built-in key-value storage API used for persisting transaction data client-side.
- **Monthly_View**: A filtered view of the Transaction_List showing only transactions recorded within a selected calendar month.
- **Validator**: The client-side logic responsible for checking that all required form fields are filled before a transaction is submitted.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in an expense form and submit it, so that my spending is recorded and tracked.

#### Acceptance Criteria

1. THE Input_Form SHALL display three fields: item name (text, maximum 100 characters), amount (number), and category (dropdown).
2. THE Input_Form SHALL include the default category options: Food, Transport, and Fun.
3. WHERE a custom category is provided by the user, THE Input_Form SHALL accept and add the custom category (maximum 50 characters) to the category list.
4. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add the transaction to the Transaction_List, persist it to LocalStorage, and THE Input_Form SHALL reset all fields to their default/empty state.
5. IF the user submits the Input_Form with one or more empty fields, THEN THE Validator SHALL prevent submission and display an inline error message adjacent to each offending field indicating which fields are missing.
6. IF the user enters a non-positive or non-numeric value in the amount field, THEN THE Validator SHALL prevent submission and display an inline error message adjacent to the amount field indicating the amount must be a positive number.
7. IF the user enters an amount greater than 999,999,999.99, THEN THE Validator SHALL prevent submission and display an error message indicating the amount exceeds the maximum allowed value.

---

### Requirement 2: View and Manage the Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review and manage my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each transaction with its item name (truncated at 100 characters), amount (formatted to 2 decimal places), and category.
2. THE Transaction_List SHALL be scrollable when the number of transactions exceeds the visible area.
3. WHEN the user selects a calendar month, THE App SHALL filter the Transaction_List to show only transactions whose recorded date matches both the selected month AND year.
4. WHEN the user selects the category sort option, THE App SHALL sort the Transaction_List by category name A–Z alphabetically.
5. WHEN the user clicks the delete button on a transaction, THE App SHALL remove that transaction from the Transaction_List and from LocalStorage within 1 second.
6. WHEN the user selects a month filter that has no transactions, THE Transaction_List SHALL display an empty state message (e.g., "No transactions for this month") rather than a blank list.

---

### Requirement 3: Display Real-Time Total Balance

**User Story:** As a user, I want to see my total spending balance at the top of the page, so that I always know how much I have spent.

#### Acceptance Criteria

1. THE Balance_Display SHALL be visible at the top of the page at all times.
2. WHEN a transaction is added, THE Balance_Display SHALL update to reflect the new total within 100ms.
3. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the new total within 100ms.
4. THE Balance_Display SHALL calculate the total as the sum of all transaction amounts, rounded to 2 decimal places.
5. WHEN the App is loaded or reloaded, THE Balance_Display SHALL display the total sum of all transactions from LocalStorage, rounded to 2 decimal places, within 500ms of page load.
6. IF there are no transactions, THE Balance_Display SHALL display 0.00.

---

### Requirement 4: Visualize Spending by Category

**User Story:** As a user, I want to see a pie chart of my spending per category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render a pie chart with each slice labeled with the category name and its percentage (rounded to 1 decimal place) of total spending.
2. WHEN a transaction is added, THE Chart SHALL update to reflect the new category totals within 100ms.
3. WHEN a transaction is deleted, THE Chart SHALL update to reflect the revised category totals within 100ms.
4. WHEN all transactions are deleted, THE Chart SHALL display a placeholder state with a message indicating no data is available, with no zero-value slices rendered.
5. THE Chart SHALL assign a distinct color to each category such that no two categories share the same color, supporting up to 20 categories.
6. IF a transaction has a zero or negative amount, THE Chart SHALL exclude that transaction from its calculations.
7. WHEN only one category has transactions, THE Chart SHALL display a full-circle (100%) single slice for that category.

---

### Requirement 5: Persist and Restore Data

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL serialize the transaction as a JSON string and write it to LocalStorage before the Transaction_List updates.
2. WHEN a transaction is deleted, THE App SHALL remove the corresponding JSON entry from LocalStorage before the Transaction_List updates.
3. WHEN the App is loaded or reloaded, THE App SHALL read and render all transactions from LocalStorage within 500ms.
4. IF LocalStorage is empty, THEN THE App SHALL render an empty Transaction_List, a balance of 0.00, and a placeholder Chart state with no data series.
5. IF LocalStorage contains malformed or unparseable JSON data, THEN THE App SHALL discard that data, render an empty state (empty list, 0.00 balance, placeholder chart), and display a non-blocking user-facing error indication (e.g., a dismissible banner).

---

### Requirement 6: Responsive and Accessible Interface

**User Story:** As a user, I want the app to work well on different screen sizes and be easy to read, so that I can use it on desktop or mobile browsers.

#### Acceptance Criteria

1. THE App SHALL render correctly on viewport widths from 320px to 1920px with no clipping, no horizontal scroll, and all interactive elements reachable.
2. THE App SHALL use a single CSS file and a single JavaScript file, keeping all styles and logic consolidated.
3. THE App SHALL display text with a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text against its background, per WCAG 2.1 AA.
4. WHEN an interactive element receives keyboard focus, THE App SHALL display a visible focus indicator with a minimum 1px outline and a contrast ratio of at least 3:1 against the adjacent background.
5. THE App SHALL load and become fully interactive (all elements responding to input) within 3 seconds on a 25 Mbps connection.
6. WHEN the viewport width is below 600px, THE App SHALL reflow to a single-column layout with no overlapping elements.
