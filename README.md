# BudgetBuddy - Student Finance Tracker

## 1. Project Identity

**Project Name:** BudgetBuddy

**Theme:** Student Finance Tracker

**Target Audience:** African Leadership University (ALU) Students


**Purpose:**
BudgetBuddy is a specialized web application designed to assist ALU students in managing their personal finances. Recognizing the unique challenges of student life, this tool provides a robust platform for tracking expenses, analyzing spending habits, and adhering to monthly budget constraints. The application aims to foster financial literacy and discipline through an intuitive, accessible, and data-driven interface.

![About Page](assets/wireframes-desktop%28About%20page%29.png)


### Wireframes

BudgetBuddy’s layout structure and page designs were planned through low-fidelity wireframes.

Miro Board:
https://miro.com/app/board/uXjVG-zaAqw=/?share_link_id=163649646526

## 2. Features Overview

BudgetBuddy offers a comprehensive suite of features tailored to student needs:

*   **Dashboard & Statistics:** A central hub providing immediate insight into financial health, including total spending, remaining budget, and efficient categorization of expenses.
*   **Transaction History:** A detailed, chronological record of all financial activities, allowing users to review past spending with ease.
*   **Transaction Management:** flexible tools to add new expenses or edit existing records to ensure accuracy.
*   **Regex Validation:** robust input validation using Regular Expressions to ensure data integrity for fields like amounts and descriptions.
*   **Advanced Regex Search & Highlighting:** A powerful search engine that allows users to filter transactions using Regular Expressions, with real-time highlighting of matched terms for quick identification.
*   **Dynamic Sorting:** Users can organize their transaction history by Date, Amount, or Description in both ascending and descending orders.
*   **Settings Configuration:** A persistent settings panel to customize the monthly budget cap and toggle search sensitivity.
*   **Data Persistence:** Automatic saving of all data to the browser's LocalStorage, ensuring no information is lost between sessions.
*   **Data Portability (JSON):** Full support for exporting transaction data to a JSON file for backup and importing data to restore or transfer records.
*   **Budget Cap Logic:** Visual and textual indicators that warn users as they approach or exceed their defined spending limits.
*   **Accessibility (a11y):** Built from the ground up with semantic HTML and ARIA standards to ensure usability for all students, including those using assistive technologies.

### Visual Walkthrough

**Dashboard Overview**
![Dashboard](assets/wireframes-desktop%28Dashboard%29.png)

**Transaction Management**
![Adding Transaction](assets/wireframes-desktop%28Adding%20transaction%29.png)

**Transaction History**
![Transaction History](assets/wireframes-desktop%28Transactions%20History%20Page%29.png)

**Settings**
![Settings](assets/wireframes-desktop%28Settings%29.png)

## 3. Data Model

The application utilizes a structured data model to represent each transaction. The conceptual schema for a record includes:

*   **id:** A unique identifier string generated for every transaction to ensure distinctness.
*   **description:** A text field detailing the nature of the expense (e.g., "Textbooks", "Groceries").
*   **amount:** A numeric value representing the cost of the transaction.
*   **category:** A classification tag (e.g., "Food", "Transport", "Academic") to group expenses.
*   **date:** The specific date when the transaction occurred.
*   **createdAt:** A timestamp recording when the entry was first created in the system.
*   **updatedAt:** A timestamp recording the last modification to the entry.

**Integrity & Persistence:**
Each record is guaranteed to be unique via its ID and is timestamped to track its lifecycle. The entire collection of records is serialized and stored locally, ensuring state persistence across browser reloads.

## 4. Regex Catalog

BudgetBuddy employs Regular Expressions extensively for both input validation and search functionality. Below is the catalog of patterns used.

### Standard Patterns

**1. Description Validation**
*   **Pattern:** ^[a-zA-Z0-9\s.,'-]{3,50}$
*   **Purpose:** Ensures the description contains only alphanumeric characters, spaces, and common punctuation, with a length between 3 and 50 characters.
*   **Valid Example:** "Lunch at Cafeteria"
*   **Invalid Example:** "Hi!" (too short) or "Lunch @ Cafe" (invalid special character)

**2. Amount Validation**
*   **Pattern:** ^\d+(\.\d{1,2})?$
*   **Purpose:** Validates that the amount is a positive number, optionally allowing up to two decimal places.
*   **Valid Example:** "1500" or "4500.50"
*   **Invalid Example:** "-100" (negative) or "10.999" (too many decimals)

**3. Date Format Validation**
*   **Pattern:** ^\d{4}-\d{2}-\d{2}$
*   **Purpose:** Enforces the standard ISO 8601 date format (YYYY-MM-DD).
*   **Valid Example:** "2023-11-25"
*   **Invalid Example:** "25-11-2023" or "2023/11/25"

**4. Category Search Filter (Simple)**
*   **Pattern:** ^(Food|Transport|Academic|Personal)$
*   **Purpose:** Used in search or validation to strictly match one of the predefined categories.
*   **Valid Example:** "Food"
*   **Invalid Example:** "Entertainment"

### Advanced Pattern

**5. Repeated Word Detection (Back-reference)**
*   **Pattern:** \b(\w+)\s+\1\b
*   **Purpose:** Detects accidental repetition of words in input fields (e.g., "Textbook Textbook") to prevent data entry errors. It uses a capturing group and a back-reference to match the same word appearing twice consecutively.
*   **Valid Example:** "Note Note" (Matches logic)
*   **Invalid Example:** "Note Book"

## 5. Sorting & Search Behavior

**Sorting Options:**
Users can reorder the transaction list dynamically. The application supports sorting by **Date** (Chronological/Reverse), **Amount** (High/Low), and **Description** (A-Z/Z-A).

**Live Regex Search:**
*   The search bar accepts valid Regular Expression patterns.
*   **Safety:** The search logic is wrapped in error handling blocks (try/catch). If a user types an incomplete or invalid regex (e.g., an open bracket `[`), the system gracefully ignores the error and treats the input as a literal string or waits for valid syntax, preventing application crashes.
*   **Clarification:** Invalid patterns are handled safely and do not interrupt rendering or sorting.
*   **Case Sensitivity:** A toggle in the Settings panel allows users to switch between case-insensitive (default) and case-sensitive matching.
*   **Highlighting:** Any text within the transaction list that matches the search query is dynamically wrapped in `<mark>` tags, providing immediate visual feedback on where the match occurred.

## 6. Stats Dashboard Logic

The dashboard provides real-time aggregation of financial data:

*   **Total Records:** Displays the count of all active transactions.
*   **Total Expenses:** Calculates the sum of 'amount' fields across all records.
*   **Budget Status:** Compares the Total Expenses against the user-defined Monthly Budget Cap. It calculates the remaining balance and updates visual indicators (green for safe, red for warning/over-budget).
*   **Top Category:** Analyzes transaction frequencies to determine and display the category where the student spends the most.
*   **Last 7 Days Trend:** Computes the total spending specifically for transactions dated within the last week, offering a view of immediate short-term spending.

## 7. Accessibility (a11y) Notes

BudgetBuddy is designed to be inclusive and accessible:

*   **Semantic Structure:** The HTML uses semantic tags (`<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`) to provide meaningful context to screen readers.
*   **Keyboard Navigation:** All interactive elements (buttons, inputs, links) are reachable and activatable via the keyboard.
*   **Focus Visibility:** Custom focus styles are implemented to clearly indicate which element is currently active for keyboard users.
*   **ARIA Live Regions:** Dynamic updates, such as successful transaction additions or validation errors, are announced to screen readers using `aria-live` regions.
*   **Contrast & Labels:** Review of color contrast ensures readability, and all form inputs have associated labels for clarity.

## 8. Keyboard Navigation Map

| Key | Action |
| :--- | :--- |
| `Tab` | Move focus to the next interactive element |
| `Shift + Tab` | Move focus to the previous interactive element |
| `Enter` / `Space` | Activate buttons, links, or submit forms |
| `Esc` | Close modals or clear search input (if implemented) |
| `Arrow Keys` | Navigate within selection lists or radio groups |

## 9. Persistence & Data Handling

**LocalStorage Auto-Save:**
The application utilizes the browser's `localStorage` API. Every time a transaction is added, edited, or deleted, or when settings are changed, the state is immediately serialized to JSON and saved. This guarantees that data persists even if the browser is closed or refreshed.

**JSON Data Management:**
*   **Export:** Users can download their entire transaction history and settings as a `.json` file for backup purposes.
*   **Import:** Users can upload a valid `.json` backup. The system validates the structure of the imported file before applying it to prevent corruption.
*   **Reset:** A distinct option allows users to clear all data, which wipes the `localStorage` and resets the application to its initial state, requiring explicit confirmation to prevent accidental data loss.

## 10. Tests

A dedicated `tests.html` file is included in the project. This suite is designed to verify the core logic of the application without manual intervention. It primarily focuses on:
*   Validating the Regex patterns against various test cases.
*   Ensuring the calculation logic for totals and remaining budget is accurate.
*   Verifying that the sorting algorithms correctly order data.

Running these tests serves as a quality assurance step to confirm the reliability of the application's mathematical and validation functions.

## 11. How to Run

1.  **Download:** Download the project ZIP file or clone the repository to your local machine.
2.  **Extract:** If downloaded as a ZIP, extract the contents to a folder.
3.  **Launch:** Navigate to the folder and double-click the `index.html` file.
4.  **Browser:** The application will open in your default web browser. No server installation or build process is required.

## 12. Academic Integrity Statement

I hereby declare that this project is my own individual work, created for the African Leadership University summative assignment.
*   **No Frameworks:** This application is built using "Vanilla" JavaScript, HTML, and CSS. No external libraries or frameworks (like React, Vue, jQuery, or Bootstrap) were used for the core functionality or styling.
*   **Artificial Intelligence:** AI tools were used solely for generating this documentation and refining the academic tone of the report. The code logic and implementation are my original work.