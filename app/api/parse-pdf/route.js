import { NextResponse } from "next/server";
import { createRequire } from "module";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function extractWithPdfJs(buffer, require) {
  try {
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");
    // Worker is not used in Node, but set to avoid warnings
    const workerPath = require.resolve("pdfjs-dist/build/pdf.worker.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const doc = await loadingTask.promise;
    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it) => it.str).join(" ");
      text += pageText + "\n";
    }
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return { lines, text };
  } catch (err) {
    console.error("pdfjs-dist fallback failed", err);
    return { lines: [], text: "", error: err.message };
  }
}

async function extractWithOcr(buffer, require) {
  try {
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");
    const { createWorker } = require("tesseract.js");
    let canvasLib;
    try {
      canvasLib = require("canvas");
    } catch (e) {
      return { lines: [], text: "", error: "OCR fallback unavailable: please install the optional dependency 'canvas' (npm i canvas)" };
    }

    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const doc = await loadingTask.promise;

    const worker = await createWorker("eng");
    let text = "";

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = canvasLib.createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");
      const renderContext = { canvasContext: context, viewport };
      await page.render(renderContext).promise;
      const pngBuffer = canvas.toBuffer("image/png");
      const { data: { text: pageText } } = await worker.recognize(pngBuffer, "eng");
      text += pageText + "\n";
    }

    await worker.terminate();

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return { lines, text };
  } catch (err) {
    console.error("OCR fallback failed", err);
    return { lines: [], text: "", error: err.message };
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const require = createRequire(import.meta.url);
    const pdfParseMod = require("pdf-parse");
    const pdfParse = pdfParseMod.default || pdfParseMod;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Attempt pdf-parse first
    try {
      const parsed = await pdfParse(buffer);
      const text = parsed.text || "";
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length > 0) {
        return NextResponse.json({ lines, text });
      }
    } catch (innerErr) {
      console.warn("pdf-parse failed, trying pdfjs-dist", innerErr);
    }

    // Fallback to pdfjs-dist extraction
    const fallback = await extractWithPdfJs(buffer, require);
    if (fallback.lines.length > 0 || fallback.error) {
      return NextResponse.json(fallback);
    }

    // Final fallback: OCR for image-only PDFs
    const ocrResult = await extractWithOcr(buffer, require);
    return NextResponse.json(ocrResult);
  } catch (err) {
    console.error("PDF parse error", err);
    return NextResponse.json(
      { error: `Failed to parse PDF: ${err.message}` },
      { status: 500 },
    );
  }
}
