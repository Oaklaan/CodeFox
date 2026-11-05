import * as vscode from 'vscode';
import { randomBytes } from 'crypto';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const provider = new FoxViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codefox.view', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('codefox.show', () =>
      vscode.commands.executeCommand('codefox.view.focus')
    ),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('codefox')) {
        provider.pushConfig();
      }
    })
  );

  if (vscode.workspace.getConfiguration('codefox').get<boolean>('showOnStartup', true)) {
    await vscode.commands.executeCommand('codefox.view.focus');
  }
}

export function deactivate(): void {}

class FoxViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    const root = vscode.Uri.joinPath(this.extensionUri, 'webview');

    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [root],
    };
    view.webview.html = getHtml(this.extensionUri, view.webview);

    view.onDidDispose(() => {
      if (this.view === view) {
        this.view = undefined;
      }
    });
  }

  pushConfig(): void {
    const c = vscode.workspace.getConfiguration('codefox');
    this.view?.webview.postMessage({
      type: 'config',
      scale: c.get<number>('scale', 4),
      wander: c.get<boolean>('wander', true),
    });
  }
}

function getHtml(extensionUri: vscode.Uri, webview: vscode.Webview): string {
  const nonce = randomBytes(16).toString('base64');
  const root = vscode.Uri.joinPath(extensionUri, 'webview');
  const script = webview.asWebviewUri(vscode.Uri.joinPath(root, 'main.js'));
  const csp = webview.cspSource;
  const c = vscode.workspace.getConfiguration('codefox');
  const scale = c.get<number>('scale', 4);
  const wander = c.get<boolean>('wander', true);

  // 'wasm-unsafe-eval' is required to instantiate the Rust/WASM core.
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; img-src ${csp} data:; style-src ${csp} 'unsafe-inline'; script-src 'nonce-${nonce}' ${csp} 'wasm-unsafe-eval'; connect-src ${csp};" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    html, body { margin: 0; padding: 0 !important; height: 100%; overflow: hidden; background: transparent; }
    #fox { display: block; width: 100%; height: 100%; touch-action: none; cursor: pointer; }
    #err { position: absolute; inset: 8px; font: 12px var(--vscode-font-family, sans-serif); color: var(--vscode-errorForeground, #f44); }
  </style>
  <title>Fox</title>
</head>
<body data-scale="${scale}" data-wander="${wander}">
  <canvas id="fox"></canvas>
  <div id="err" hidden></div>
  <script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
}
