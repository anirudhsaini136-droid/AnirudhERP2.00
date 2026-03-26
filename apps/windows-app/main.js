const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

log.initialize();
autoUpdater.logger = log;

/** Resolve at runtime: env (dev) > user config file > package.json default. Installed .exe does NOT inherit your build-terminal env. */
function getAppOrigin() {
  const pkgPath = path.join(__dirname, "package.json");
  let pkgDefault = "https://erp.thenextwebsolution.com";
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.erpWebOrigin) pkgDefault = pkg.erpWebOrigin;
  } catch (_) {}

  if (process.env.ERP_WEB_ORIGIN && process.env.ERP_WEB_ORIGIN.trim()) {
    return process.env.ERP_WEB_ORIGIN.replace(/\/$/, "");
  }

  try {
    const cfgPath = path.join(app.getPath("userData"), "erp-config.json");
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      if (cfg.webOrigin && String(cfg.webOrigin).trim()) {
        return String(cfg.webOrigin).trim().replace(/\/$/, "");
      }
    }
  } catch (_) {}

  return pkgDefault.replace(/\/$/, "");
}

let APP_ORIGIN = getAppOrigin();

function showLoadErrorPage(win, url, errorCode, errorDescription) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Could not load</title>
  <style>body{font-family:system-ui,sans-serif;padding:24px;background:#0b0d11;color:#e6edf3;max-width:640px;margin:auto}
  h1{color:#f85149} code{background:#161b22;padding:2px 8px;border-radius:6px}</style></head><body>
  <h1>Could not open ERP</h1>
  <p>This app loads your ERP from a web URL. The page failed to load.</p>
  <p><b>URL tried:</b> <code>${url}</code></p>
  <p><b>Error:</b> ${errorCode} — ${errorDescription || ""}</p>
  <hr style="border-color:#30363d">
  <p><b>Fix:</b> Use menu <b>Actions → Set ERP website URL…</b> and enter your site (e.g. <code>https://erp.thenextwebsolution.com</code>), then reopen the app.</p>
  <p>Rebuild is not required — the URL is saved on this PC.</p>
  </body></html>`;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  APP_ORIGIN = getAppOrigin();
  const startUrl = `${APP_ORIGIN}/login`;

  win.webContents.once("did-finish-load", () => {
    if (process.env.ERP_OPEN_DEVTOOLS === "1") {
      win.webContents.openDevTools({ mode: "detach" });
    }
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    log.error("did-fail-load", errorCode, errorDescription, validatedURL);
    showLoadErrorPage(win, validatedURL || startUrl, errorCode, errorDescription);
  });

  win.loadURL(startUrl).catch((err) => {
    log.error("loadURL", err);
    showLoadErrorPage(win, startUrl, -2, err?.message || String(err));
  });
  buildMenu(win);
}

function buildMenu(win) {
  const modules = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Manage Users", path: "/dashboard/users" },
    { label: "Business Settings", path: "/dashboard/settings" },
    { label: "HR Dashboard", path: "/hr" },
    { label: "Employees", path: "/hr/employees" },
    { label: "Attendance", path: "/hr/attendance" },
    { label: "Leave", path: "/hr/leave" },
    { label: "Payroll", path: "/hr/payroll" },
    { label: "Finance Dashboard", path: "/finance" },
    { label: "Invoices", path: "/finance/invoices" },
    { label: "Customer Ledger", path: "/finance/customers" },
    { label: "Expenses", path: "/finance/expenses" },
    { label: "Reports", path: "/finance/reports" },
    { label: "GST Reports", path: "/finance/gst" },
    { label: "Purchases", path: "/purchases" },
    { label: "Accounting", path: "/accounting" },
    { label: "Inventory", path: "/inventory" },
    { label: "Quick Bill", path: "/inventory/billing" },
    { label: "CA Portal", path: "/ca" },
    { label: "Staff Home", path: "/staff" },
    { label: "Staff Attendance", path: "/staff/attendance" },
    { label: "Staff Leave", path: "/staff/leave" },
    { label: "Staff Payslips", path: "/staff/payslips" },
    { label: "Staff Profile", path: "/staff/profile" }
  ];

  const items = [
    {
      label: "Modules",
      submenu: modules.map((m) => ({
        label: m.label,
        click: () => {
          APP_ORIGIN = getAppOrigin();
          win.loadURL(`${APP_ORIGIN}${m.path}`);
        }
      }))
    },
    {
      label: "Actions",
      submenu: [
        {
          label: "Set ERP website URL…",
          click: async () => {
            const current = getAppOrigin();
            const dir = app.getPath("userData");
            const cfgFile = path.join(dir, "erp-config.json");
            const res = await dialog.showMessageBox(win, {
              type: "info",
              title: "ERP website URL",
              message: `Current URL loaded by the app:\n${current}\n\nTo change it, create or edit:\n${cfgFile}\n\nExample:\n{"webOrigin":"https://erp.thenextwebsolution.com"}\n\nThen use Reload or restart the app.`,
              buttons: ["Open folder", "Cancel"]
            });
            if (res.response === 0) shell.openPath(dir);
          }
        },
        { label: "Toggle Developer Tools", click: () => win.webContents.toggleDevTools() },
        { label: "Reload page", click: () => win.reload() },
        { label: "Print Current Page", click: () => win.webContents.print() },
        { label: "Export Page to PDF", click: () => exportPdf(win) },
        { label: "Check for Updates", click: () => autoUpdater.checkForUpdatesAndNotify() }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(items));
}

async function exportPdf(win) {
  const { canceled, filePath } = await dialog.showSaveDialog({
    filters: [{ name: "PDF", extensions: ["pdf"] }]
  });
  if (canceled || !filePath) return;
  const data = await win.webContents.printToPDF({});
  require("fs").writeFileSync(filePath, data);
}

app.whenReady().then(() => {
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.handle("desktop:get-info", () => ({ platform: process.platform, version: app.getVersion() }));
