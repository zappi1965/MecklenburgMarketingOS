```markdown
# MecklenburgMarketingOS Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the MecklenburgMarketingOS JavaScript codebase. It covers file naming, import/export styles, commit message habits, and testing patterns. While no specific frameworks are used, the repository maintains a consistent style for code organization and testing. This guide will help you quickly align with the project's standards and streamline your contributions.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `userProfile.js`, `marketingDataLoader.js`

### Import Style
- Use **relative imports** for modules within the project.
  - Example:
    ```javascript
    import { fetchData } from './apiUtils';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```javascript
    // In marketingDataLoader.js
    export function loadMarketingData() { ... }
    ```

### Commit Messages
- Freeform commit messages, no enforced prefix.
- Average commit message length: ~81 characters.
- Example:
  ```
  Fix issue with campaign data parsing in analytics module
  ```

## Workflows

### Adding a New Module
**Trigger:** When you need to add a new feature or utility to the codebase  
**Command:** `/add-module`

1. Create a new file using camelCase naming (e.g., `newFeature.js`).
2. Write your module logic using named exports.
    ```javascript
    export function newFeature() { ... }
    ```
3. Use relative imports to include dependencies.
    ```javascript
    import { helperFunction } from '../utils/helperFunction';
    ```
4. Add or update corresponding test files as `*.test.js`.
5. Commit your changes with a clear, descriptive message.

### Writing Tests
**Trigger:** When you add or modify code that requires testing  
**Command:** `/write-test`

1. Create a test file with the same base name as the module, ending with `.test.js` (e.g., `newFeature.test.js`).
2. Write your tests according to the project's testing framework (unknown; follow existing patterns).
3. Run tests using the project's test runner (refer to project documentation or scripts).
4. Ensure all tests pass before committing.

### Refactoring Code
**Trigger:** When improving code structure or readability  
**Command:** `/refactor`

1. Identify the module(s) to refactor.
2. Update code while maintaining camelCase file naming and named exports.
3. Update all relative imports as needed.
4. Run all tests to ensure no regressions.
5. Commit with a descriptive message explaining the refactor.

## Testing Patterns

- Test files follow the pattern: `*.test.js`
- Place test files alongside or near the modules they test.
- The specific testing framework is unknown; follow the structure of existing test files.
- Example test file name: `marketingDataLoader.test.js`

## Commands
| Command       | Purpose                                      |
|---------------|----------------------------------------------|
| /add-module   | Add a new module following project patterns  |
| /write-test   | Write or update tests for a module           |
| /refactor     | Refactor existing code while following conventions |
```
