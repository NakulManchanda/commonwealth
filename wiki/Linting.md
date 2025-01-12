
## Linting
### Commands
All linting commands should be run from root.
- `yarn lint`
    - Lints new code changes that have yet to be committed.
- `yarn lint-all`
    - Lints all code (regardless of changes)
- `yarn lint-branch`
    - Lints all changes made in a branch (used in CI). This is the command most people will want to use.
### Configuration
There is a single root `.eslintrc.js` file. All packages inherit from this config. Child configs in specific packages can modify/override the rules as well as the settings defined by the parent config.

Global rules we eventually want to turn back on:
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/consistent-type-imports`

We will slowly remove rules turned off in the Commonwealth `.eslintrc.js`

## Formatting
We use Prettier for formatting our codebase. There is only 1 prettier config and it is `.prettierrc.json` at the root of the repo.
**Never run prettier from anywhere other than root to avoid conflicting prettier configs!**

### Commands
Formatting commands should **always** be executed from root.
- `yarn format`
    - execute prettier and format the entire repo
- `yarn format-check`
    - execute prettier in check mode which means it lists files that require formatting but doesn't actually format them


