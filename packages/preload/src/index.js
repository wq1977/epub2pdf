import { contextBridge, ipcRenderer, app } from "electron";
const md5 = require("md5");
const AdmZip = require("adm-zip");
var epubParser = require("epub-parser");
import { PDFDocument } from "pdf-lib";

const apiKey = "electron";
/**
 * @see https://github.com/electron/electron/issues/21437#issuecomment-573522360
 */
const api = {
  versions: process.versions,
  async selectePub() {
    return await ipcRenderer.invoke("select-epub");
  },
  async download(book) {
    const pdfDoc = await PDFDocument.create();
    const cover = book.cover.toLowerCase();
    let coverImg;
    if (cover.endsWith(".jpg") || cover.endsWith(".jpeg")) {
      coverImg = await pdfDoc.embedJpg(require("fs").readFileSync(book.cover));
    } else {
      coverImg = await pdfDoc.embedPng(require("fs").readFileSync(book.cover));
    }
    console.log("cover", coverImg.width, coverImg.height);
    const scale = Math.min(447 / coverImg.width, 596 / coverImg.height);
    const coverDims = coverImg.scale(scale);
    const page = pdfDoc.addPage();
    page.setSize(447, 596);
    page.drawImage(coverImg, {
      x: page.getWidth() / 2 - coverDims.width / 2,
      y: page.getHeight() / 2 - coverDims.height / 2,
      width: coverDims.width,
      height: coverDims.height,
    });
    for (let item of book.content) {
      if (item.id.indexOf("titlepage") >= 0) continue;
      console.log("progress:", item.label);
      const path = await api.itemPdfPath(item);
      const pdfA = await PDFDocument.load(
        require("fs").readFileSync(path.substr(7))
      );
      const copiedPagesA = await pdfDoc.copyPages(pdfA, pdfA.getPageIndices());
      copiedPagesA.forEach((page) => pdfDoc.addPage(page));
    }
    require("fs").writeFileSync(book.output, await pdfDoc.save());
  },
  async unzip(path, out) {
    const zip = new AdmZip(path);
    zip.extractAllTo(out, true);
  },
  async convertPartPdf(src, output, debug = false) {
    const dir = require("path").dirname(output);
    if (!require("fs").existsSync(dir)) {
      require("fs").mkdirSync(dir);
    }
    await ipcRenderer.invoke("convert-pdf", { src, output, debug });
  },
  async itemPdfPath(item) {
    const { id, src, tempbase } = item;
    const tempPDF = require("path").join(tempbase, "pdf");
    const pdfPath = require("path").join(tempPDF, `${id}.pdf`);
    if (!require("fs").existsSync(pdfPath)) {
      const tempEpub = require("path").join(tempbase, "epub");
      await api.convertPartPdf(
        `http://127.0.0.1:7777${tempEpub}/${src}`,
        pdfPath,
        item.debug
      );
    }
    return `file://${pdfPath}`;
  },
  async convertePub(path) {
    const epub = await new Promise((resolve, reject) => {
      epubParser.open(path, function (err, epubData) {
        if (err) return reject(err);
        resolve(epubData);
      });
    });
    console.log(epub);
    const tempbase = require("fs").mkdtempSync(
      require("path").join(require("os").tmpdir(), md5(path))
    );
    const tempEpub = require("path").join(tempbase, "epub");
    api.unzip(path, tempEpub);
    const ncxmap = epub.raw.json.ncx.navMap[0].navPoint.reduce(
      (r, navPoint) => {
        const id = navPoint.$.id;
        const label = navPoint.navLabel[0].text[0];
        r[id] = label;
        return r;
      },
      {}
    );
    return {
      src: path,
      cover: require("path").join(tempEpub, epub.easy.epub2CoverUrl),
      output: require("path").join(
        require("path").dirname(path),
        require("path").basename(path).replace(".epub", ".pdf")
      ),
      content: epub.raw.json.opf.spine[0].itemref.map((item) => {
        const id = item.$.item.$.id;
        const src = item.$.item.$.href;
        return {
          id,
          src,
          label: ncxmap[id] || `__${id}`,
          tempbase,
        };
      }),
    };
    // return epub.raw.json.ncx.navMap[0].navPoint.map((navPoint) => {
    //   const id = navPoint.$.id;
    //   const src = navPoint.content[0].$.src;
    //   const label = navPoint.navLabel[0].text[0];
    //   return { id, src, label, tempbase };
    // });
  },
};

/**
 * The "Main World" is the JavaScript context that your main renderer code runs in.
 * By default, the page you load in your renderer executes code in this world.
 *
 * @see https://www.electronjs.org/docs/api/context-bridge
 */
contextBridge.exposeInMainWorld(apiKey, api);
