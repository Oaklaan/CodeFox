# Contributing to CodeFox

Thanks for your interest in improving CodeFox. This guide covers how to set up
the project, make a change, and verify it before opening a pull request.

## Before you start

- Check the README and [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the
  current behavior and where a change belongs.
- For larger changes or behavior changes, open an issue or discussion first so
  the scope can be agreed before implementation.
- Keep contributions focused. Avoid bundling unrelated formatting or cleanup
  with a functional change.

## Development setup

You will need:

- Visual Studio Code 1.85 or newer.
- Node.js 18 or newer and npm.
- Rust stable, the `wasm32-unknown-unknown` target, and `wasm-pack` to build
  the WebAssembly core.

Install the Rust target and `wasm-pack` if needed:

```powershell
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

Install dependencies and build:

```bash
npm ci
npm run build
```

Open the repository in VS Code and press **F5** to launch the Extension
Development Host. Test the Fox view in the Explorer sidebar. You can also run
**Fox: Show** from the Command Palette.

## Where to make changes

- **VS Code integration, settings, commands, and webview lifecycle:** edit
  `src/extension.ts` and update the contributions in `package.json` when
  needed.
- **Rendering, pointer input, resizing, and webview UI:** edit
  `webview/main.js`.
- **Simulation behavior:** edit `core/src/lib.rs`. Keep simulation rules in
  Rust and presentation concerns in the webview.
- **Fox artwork and extension branding:** edit the relevant assets in `media/`.

`webview/pkg/` contains generated wasm-bindgen output. Change the Rust source
and regenerate the output with `npm run build:wasm`; do not hand-edit generated
bindings. Ensure generated WASM and glue files are present before packaging.

If you add a setting, update its manifest contribution, initial webview value,
live configuration handling, and relevant documentation so the behavior stays
consistent.

## Verification

Run the relevant checks before submitting:

```bash
cargo test --manifest-path core/Cargo.toml
npm run build
npm run package
```

For webview or extension-host changes, launch the Extension Development Host
and manually check the affected behavior, including relevant settings and
interactions. Install and exercise the VSIX locally when changing packaging or
runtime assets.

The current project does not define separate JavaScript test, lint, or
webview-test scripts. CI runs the Rust tests and packages the extension on
pushes and pull requests.

## Implementation guidelines

- Preserve the separation between VS Code integration, webview rendering, and
  Rust simulation described in [ARCHITECTURE.md](./ARCHITECTURE.md).
- Keep the webview's local resource roots and Content Security Policy
  restrictive. Do not add remote resources or broaden the policy without a
  clear requirement.
- Treat host/webview messages and the wasm-bindgen API as explicit interfaces;
  update both ends when they change.
- Prefer focused tests for simulation behavior and ensure docs and changelog
  entries reflect user-visible changes.
- Never commit credentials, Marketplace tokens, or other secrets.

## Pull requests

1. Create a branch for your change.
2. Make a focused change and run the applicable checks above.
3. Update documentation and `CHANGELOG.md` for user-visible changes.
4. Open a pull request with a concise description, the motivation, and
   verification steps. Include screenshots or a short recording for visible UI
   changes when practical.
5. Call out any known limitations or follow-up work.

Pull requests should be ready for review, avoid unrelated changes, and explain
any behavior or compatibility changes. Marketplace releases are managed
separately by the project maintainer.
