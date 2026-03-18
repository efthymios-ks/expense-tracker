# HTML / CSS / JS Coding Guidelines

## General
- Use ES2025 features and syntax where appropriate.
- Prefer clarity over brevity.
- Do not refactor or modify files under `/lib` — only read them for reference.

## Naming
- Fully descriptive variable, parameter, and lambda parameter names — no abbreviations.
- Files & folders: `kebab-case`
- Constants files: `UPPER_SNAKE_CASE.js`
- Match filename to its primary export where applicable.

## Formatting
- Terminate all statements with `;`.
- Always use curly braces `{}`, even for single-line `if`, `for`, `while`.
- Always use template literals for strings with variables — no `+` concatenation.
- One empty line after a closing `}`, except when followed by `)`, `,`, `;`, `}`, `else`, `catch`, or `finally`.

## HTML Attributes
- Each attribute on its own line, indented 2 spaces relative to the tag.
- Closing `>` on its own line, at the same indent as the tag.
- Closing `</tag>` on its own line, at the same indent as the opening tag.
- Exception: short inline elements with no attributes or a single short attribute and short text may stay on one line.

```html
<input
  type="text"
  id="userName"
  placeholder="Enter your name"
>
```

## Imports
- Order: (1) third-party `/lib`, (2) utilities, (3) components — each group separated by a blank line.

## Error Handling
- Always use `try/catch` for async operations and anything that can throw.
- Never silently swallow errors — always log or rethrow.
- Use descriptive error variable names — no `e` or `err`.

## Comments
- Use `//` for single-line comments.
- Use `/** */` JSDoc for functions — document parameters and return values.
- Explain **why**, not what.