const { app, BrowserWindow, Menu, shell, protocol, net } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.join(__dirname, "..", "electron-dist");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

function create() {
  const win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#0c0a08",
    title: "Gablota — katalog banknotów",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  Menu.setApplicationMenu(null);
  win.webContents.setWindowOpenHandler(({ url }) => (shell.openExternal(url), { action: "deny" }));
  win.loadURL("app://gablota/index.html");
}

app.whenReady().then(() => {
  protocol.handle("app", (req) => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
    if (!file.startsWith(ROOT)) return new Response("Forbidden", { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  create();
});
app.on("window-all-closed", () => app.quit());
