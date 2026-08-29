# Contributing

Thanks for your interest in improving this project!

This project is licensed under the **GNU General Public License v3.0 (GPL-3)**. Contributions are welcome, and by submitting changes you agree that your work will be distributed under the same terms. See [COPYING](COPYING) for the full license text.

For the project overview, see [README.md](README.md).

## Improvements

### Pull Requests

1. Fork the repository and create a feature branch from `master`.
2. Keep changes focused, small, and easy to review.
3. Follow the existing project structure and coding style.
4. Run validation and linting before opening a pull request.
5. Open a pull request with a clear summary of what changed and why.

### Code Expectations

* Prefer small, readable changes over broad rewrites.
* Keep naming and structure consistent with the existing codebase.
* Respect browser extension constraints and maintain compatibility across supported browsers.
* Avoid adding unnecessary third-party dependencies or unrelated refactors.

### Validation

Before submitting a pull request, ensure your code passes validation:

```bash
npm run lint
```

If you are changing behavior or presentation, include a brief description of the expected user-facing impact.

## Project Direction & Ecosystem Etiquette

I welcome contributions, feature requests, and discussions that meaningfully improve this project.

However, I kindly ask developers in the community not to create separate, competing browser extensions that largely duplicate this project without providing clear, unique value.

If you plan to publish an alternative or derived extension, it should be clearly justified by substantial new functionality, a distinct use case, or an architectural approach that falls outside this project's scope. Whenever possible, I encourage bringing those ideas directly to this repository as contributions instead.

**Note: This is a community norm and personal preference, not a binding legal restriction. It does not alter or add limitations to the GPL-3 license.**

### Questions & Discussions

If you are unsure whether a planned feature fits the project direction, please open an issue to discuss it with me before spending time on a large implementation.
