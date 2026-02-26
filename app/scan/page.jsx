"use client";

import { useState } from "react";

export default function ScanPage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState(null);
  const [parsing, setParsing] = useState(false);

  const requiredNote = `Required columns: amount, date, description (or merchant). Optional: category, accountId, type.`;

  function normalizeHeader(h) {
    return String(h || "").trim().toLowerCase();
  }

  function mapRowToTransaction(row, headerMap) {
    // headerMap maps canonical -> original header
    const get = (keys) => {
      for (const k of keys) {
        const hk = headerMap[k];
        if (hk && row[hk] !== undefined && row[hk] !== null && String(row[hk]).trim() !== "") return row[hk];
      }
      return undefined;
    };

    const amountRaw = get(["amount", "total", "price"]);
    const amount = amountRaw !== undefined ? parseFloat(String(amountRaw).replace(/[^0-9.-]/g, "")) : undefined;
    const date = get(["date", "transactiondate", "txn_date"]);
    const description = get(["description", "merchant", "store", "payee"]);
    const category = get(["category"]);
    const accountId = get(["accountid", "account", "account_id"]);
    const type = get(["type"]) || (amount && amount > 0 ? "EXPENSE" : "EXPENSE");

    return {
      amount: isNaN(amount) ? null : amount,
      date: date || new Date().toISOString().split("T")[0],
      description: description || "Imported Transaction",
      category: category || "other-expense",
      accountId: accountId || null,
      type,
      raw: row,
    };
  }

  async function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setParsing(true);
    try {
      const Papa = (await import("papaparse")).default;
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = results.data || [];
          const hdrs = results.meta.fields || (parsed[0] ? Object.keys(parsed[0]) : []);
          const lower = hdrs.map((h) => normalizeHeader(h));

          // build headerMap canonical -> original header name
          const headerMap = {};
          lower.forEach((lh, i) => {
            headerMap[lh] = hdrs[i];
          });

          // also attempt to map common synonyms
          const canonical = {};
          for (const h of Object.keys(headerMap)) {
            if (/amount|total|price|amt/i.test(h)) canonical["amount"] = headerMap[h];
            if (/date|transactiondate|txn_date/i.test(h)) canonical["date"] = headerMap[h];
            if (/description|merchant|store|payee/i.test(h)) canonical["description"] = headerMap[h];
            if (/category/i.test(h)) canonical["category"] = headerMap[h];
            if (/account|accountid|account_id/i.test(h)) canonical["accountid"] = headerMap[h];
            if (/type/i.test(h)) canonical["type"] = headerMap[h];
          }

          const mapped = parsed.map((r) => mapRowToTransaction(r, canonical));
          setRows(mapped);
          setHeaders(hdrs);
          setSelected(new Set(mapped.map((_, i) => i)));
          setParsing(false);
        },
        error: (err) => {
          setError(String(err));
          setParsing(false);
        },
      });
    } catch (err) {
      setError(String(err));
      setParsing(false);
    }
  }

  function toggleRow(i) {
    const s = new Set(selected);
    if (s.has(i)) s.delete(i);
    else s.add(i);
    setSelected(s);
  }

  async function addSelected() {
    const toAdd = Array.from(selected).map((i) => rows[i]).filter(Boolean);
    if (!toAdd.length) return setError("No rows selected");
    try {
      const res = await fetch("/api/transactions/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: toAdd }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Bulk import failed");
      // summarize results
      const successCount = json.results.filter((r) => r.success).length;
      alert(`Imported ${successCount} / ${toAdd.length} transactions`);
      // Clear selection/imported rows
      setRows((prev) => prev.filter((_, i) => !selected.has(i)));
      setSelected(new Set());
    } catch (err) {
      setError(String(err));
    }
  }

  function exportSelectedCSV() {
    const toExport = Array.from(selected).map((i) => rows[i]);
    if (!toExport.length) return setError("No rows selected");
    const rowsOut = [
      ["amount", "date", "description", "category", "accountId", "type"],
      ...toExport.map((r) => [r.amount, r.date, r.description, r.category, r.accountId, r.type]),
    ];
    const csv = rowsOut.map((rr) => rr.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Import Transactions (CSV)</h1>
      <p className="mb-2 text-sm text-gray-600">{requiredNote}</p>
      <input type="file" accept="text/csv,.csv" onChange={handleFile} />
      {parsing && <div className="mt-4">Parsing CSV...</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}

      {rows.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={addSelected}>
              Add Selected ({selected.size})
            </button>
            <button className="px-3 py-2 bg-gray-600 text-white rounded" onClick={exportSelectedCSV}>
              Export Selected CSV
            </button>
          </div>
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">#</th>
                  <th className="p-2">Select</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">
                      <input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)} />
                    </td>
                    <td className="p-2">{r.amount ?? "—"}</td>
                    <td className="p-2">{r.date}</td>
                    <td className="p-2">{r.description}</td>
                    <td className="p-2">{r.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
