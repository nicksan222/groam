# Vendored glib 0.18.5

This directory is the published `glib` 0.18.5 crate from
<https://static.crates.io/crates/glib/glib-0.18.5.crate>.

- Archive SHA-256: `233daaf6e83ae6a12a52055f568f9d7cf4671dabb78ff9560ab6da230ce00ee5`
- Security advisory: `GHSA-wrw7-89jp-8q8g`
- Applied upstream fix: `gtk-rs/gtk-rs-core@44ff04449535135aa82507ff492883bba77a9b75`
- Local delta: the commit's exact two-line `VariantStrIter::impl_get` mutability patch in `src/variant_iter.rs`
- Manifest delta: a `[lints.rust]` table allowing `mismatched_lifetime_syntaxes` and `unused_parens`.
  A path patch is linted like our own code, so newer rustc lints on this 2023 source would
  otherwise warn on every desktop build; registry crates get the same silence from `--cap-lints`.

The upstream `LICENSE` and `COPYRIGHT` files are preserved in the crate directory.
