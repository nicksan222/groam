# Kloq calendar source

Third-party calendar source from the Kloq registry, retained under its MIT license.
Groam uses it through `src/components/plan-calendar` and supplies theme overrides in
`src/styles/kloq-groam.css`. App code imports the public plan-calendar entrypoint.

The repository's formatter, linter, React Doctor, and dead-code checks exclude
vendored source, as they do installed dependencies. Groam-owned adapters, styles,
components, and integration tests remain in the normal quality checks. TypeScript
still checks imported vendor modules; unused bindings were removed to meet the
workspace compiler settings.
