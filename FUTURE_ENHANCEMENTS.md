# Future Enhancements

This document is a collection of possible improvements to CodeFox, not a
committed roadmap or a promise of delivery. Ideas should be discussed and
prioritized based on user feedback, maintenance cost, accessibility, and
compatibility with the extension's lightweight design.

## Candidate improvements

### User experience and accessibility

- **Keyboard controls:** Allow keyboard users to focus the Fox view and trigger
  the same interactions as pointer users.
- **Reduced-motion option:** Provide a setting to pause or reduce animation
  while retaining a useful static view.
- **Accessible status:** Expose concise fox state information to assistive
  technologies without making the animation noisy.
- **More interaction options:** Consider configurable controls or optional
  actions while keeping the default experience simple.

### Customization

- **Appearance choices:** Explore alternate fox palettes or sprite themes.
- **Behavior tuning:** Consider settings for idle timing, walking frequency,
  and sleep behavior if users request more control.
- **View controls:** Consider commands to pause, resume, or reset the fox.

### Engineering quality

- **Webview tests:** Add tests for rendering setup, message handling, settings
  updates, and interaction wiring.
- **Extension integration tests:** Verify view registration, startup behavior,
  commands, and settings in a VS Code test host.
- **Automated accessibility checks:** Add a repeatable accessibility review
  for webview controls and status.
- **Cross-platform packaging checks:** Exercise the build and VSIX installation
  on Windows, macOS, and Linux in CI where practical.

### Release workflow

- **Release automation:** Consider a tag- or release-triggered workflow that
  validates the version, builds the VSIX, and publishes only when explicitly
  configured and authorized.
- **Release notes automation:** Generate or validate release notes from the
  changelog and version metadata.
- **Artifact provenance:** Retain build artifacts and release metadata so a
  published VSIX can be traced to its source revision.

## Prioritization principles

When evaluating proposals:

1. Prefer improvements that preserve the extension's small, local-first
   experience.
2. Account for keyboard access, reduced motion, and assistive technology.
3. Avoid collecting user data or adding network dependencies unless there is a
   clear user benefit and the privacy implications are understood.
4. Keep Rust simulation logic, webview rendering, and VS Code integration
   separated as described in [ARCHITECTURE.md](./ARCHITECTURE.md).
5. Update [CONTRIBUTING.md](./CONTRIBUTING.md), tests, settings, and release
   documentation when an accepted enhancement changes contributor workflows
   or user-facing behavior.

## Proposing an enhancement

Open an issue describing the user need, proposed behavior, and relevant
accessibility or compatibility considerations. For larger proposals, outline
the expected impact on the extension host, webview, Rust/WASM interface,
tests, and packaging before implementation.
