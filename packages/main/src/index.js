import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { URL } from "url";
import { PDFDocument } from "pdf-lib";

ipcMain.handle("select-epub", async () => {
  const { dialog } = require("electron");
  return await dialog.showOpenDialog({
    filters: [{ name: "epub File", extensions: ["epub"] }],
    properties: ["openFile"],
  });
});

ipcMain.handle("convert-pdf", async function (_, payload) {
  const { src, output } = payload;
  const error = await new Promise(async (resolve) => {
    const win = new BrowserWindow({
      transparent: true,
      webPreferences: {
        webSecurity: false,
      },
    });
    win.hide();
    // const win = new BrowserWindow({
    //   webPreferences: {
    //     webSecurity: false,
    //   },
    // });
    win.loadURL(`${src}?seed=${new Date().getTime()}`);
    win.webContents.on("did-finish-load", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const data = await win.webContents.printToPDF({
        marginsType: 1,
        pageSize: {
          width: 157794 - 2 * 10000,
          height: 210392 - 2 * 10000,
        },
      });
      require("fs").writeFile(output, data, (error) => {
        if (error) resolve(error);
        else resolve();
        win.close();
      });
    });
    // await win.webContents.executeJavaScript(`(()=>{
    //     document.querySelectorAll('*').forEach(function(node) {
    //       console.log(node.classList[0],node.computedStyleMap().get('font-weight'), node.computedStyleMap().get('font-family').toString())
    //       if (node.computedStyleMap().get('line-height').value !== 'normal') {
    //         node.style.lineHeight = '200%';
    //       }
    //       const weight = node.computedStyleMap().get('font-weight').value
    //       if (weight === weight + 0) {
    //         node.style.fontWeight = weight + 200;
    //       }
    //     });
    //   })()`);
  });
  if (!error) {
    const pdfDoc = await PDFDocument.load(require("fs").readFileSync(output));
    const pages = pdfDoc.getPages();
    for (let page of pages) {
      page.setSize(
        page.getWidth() + Math.round((72 * 2) / 2.54),
        page.getHeight() + Math.round((72 * 2) / 2.54)
      );
      console.log("page size", page.getWidth(), page.getHeight());
      page.translateContent(Math.round(72 / 2.54), Math.round(72 / 2.54));
    }
    require("fs").writeFileSync(output, await pdfDoc.save());
  } else {
    console.log("error:", error);
  }
});

const isSingleInstance = app.requestSingleInstanceLock();

if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}

app.disableHardwareAcceleration();

// Install "Vue.js devtools"
if (import.meta.env.MODE === "development") {
  app
    .whenReady()
    .then(() => import("electron-devtools-installer"))
    .then(({ default: installExtension, VUEJS3_DEVTOOLS }) =>
      installExtension(VUEJS3_DEVTOOLS, {
        loadExtensionOptions: {
          allowFileAccess: true,
        },
      })
    )
    .catch((e) => console.error("Failed install extension:", e));
}

let mainWindow = null;

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    show: false, // Use 'ready-to-show' event to show window
    webPreferences: {
      webSecurity: false,
      nativeWindowOpen: true,
      preload: join(__dirname, "../../preload/dist/index.cjs"),
    },
  });

  /**
   * If you install `show: true` then it can cause issues when trying to close the window.
   * Use `show: false` and listener events `ready-to-show` to fix these issues.
   *
   * @see https://github.com/electron/electron/issues/25012
   */
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  /**
   * URL for main window.
   * Vite dev server for development.
   * `file://../renderer/index.html` for production and test
   */
  const pageUrl =
    import.meta.env.MODE === "development" &&
    import.meta.env.VITE_DEV_SERVER_URL !== undefined
      ? import.meta.env.VITE_DEV_SERVER_URL
      : new URL(
          "../renderer/dist/index.html",
          "file://" + __dirname
        ).toString();

  await mainWindow.loadURL(pageUrl);
};

app.on("second-instance", () => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app
  .whenReady()
  .then(createWindow)
  .catch((e) => console.error("Failed create window:", e));

// Auto-updates
if (import.meta.env.PROD) {
  app
    .whenReady()
    .then(() => import("electron-updater"))
    .then(({ autoUpdater }) => autoUpdater.checkForUpdatesAndNotify())
    .catch((e) => console.error("Failed check updates:", e));
}
