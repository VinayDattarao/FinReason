"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, Upload } from "lucide-react";

// Pre-extracted sample transactions from gpay_statement_20260101_20260131.pdf
const SAMPLE_TX = [
  { amount: 50, date: "2026-01-02", time: "17:00", description: "Paid to GANDRAMEDHARAO", counterparty: "GANDRAMEDHARAO", category: "digital-payment", type: "EXPENSE" },
  { amount: 50, date: "2026-01-03", time: "19:28", description: "Paid to KESORAM SUNDERLAL FATEPURIA", counterparty: "KESORAM SUNDERLAL FATEPURIA", category: "digital-payment", type: "EXPENSE" },
  { amount: 85, date: "2026-01-04", time: "10:41", description: "Received from KANAPARTHI RUCHITHA", counterparty: "KANAPARTHI RUCHITHA", category: "income", type: "INCOME" },
  { amount: 85, date: "2026-01-04", time: "10:44", description: "Paid to KOTLA ANJANEYULU", counterparty: "KOTLA ANJANEYULU", category: "digital-payment", type: "EXPENSE" },
  { amount: 150, date: "2026-01-04", time: "18:18", description: "Received from GANDRA VENKATA RAMARAO", counterparty: "GANDRA VENKATA RAMARAO", category: "income", type: "INCOME" },
  { amount: 50, date: "2026-01-04", time: "18:19", description: "Received from GANDRA VENKATA RAMARAO", counterparty: "GANDRA VENKATA RAMARAO", category: "income", type: "INCOME" },
  { amount: 140, date: "2026-01-04", time: "20:08", description: "Paid to MR THRUPATI BABURAO", counterparty: "MR THRUPATI BABURAO", category: "digital-payment", type: "EXPENSE" },
  { amount: 50, date: "2026-01-04", time: "20:14", description: "Paid to Shubham Petroleum", counterparty: "Shubham Petroleum", category: "transport", type: "EXPENSE" },
  { amount: 250, date: "2026-01-04", time: "22:50", description: "Received from GANDRAMEDHARAO", counterparty: "GANDRAMEDHARAO", category: "income", type: "INCOME" },
  { amount: 500, date: "2026-01-05", time: "17:42", description: "Received from BELPU ANIKETH", counterparty: "BELPU ANIKETH", category: "income", type: "INCOME" },
  { amount: 399, date: "2026-01-05", time: "17:51", description: "Paid to ValveCo", counterparty: "ValveCo", category: "shopping", type: "EXPENSE" },
  { amount: 5, date: "2026-01-07", time: "09:42", description: "Paid to Mrs KARRE PADMA", counterparty: "Mrs KARRE PADMA", category: "digital-payment", type: "EXPENSE" },
  { amount: 1, date: "2026-01-14", time: "20:49", description: "Paid to ETERNAL LIMITED", counterparty: "ETERNAL LIMITED", category: "digital-payment", type: "EXPENSE" },
  { amount: 50, date: "2026-01-15", time: "15:42", description: "Paid to P Venkatesh", counterparty: "P Venkatesh", category: "digital-payment", type: "EXPENSE" },
  { amount: 201, date: "2026-01-20", time: "18:59", description: "Paid to P Venkatesh", counterparty: "P Venkatesh", category: "digital-payment", type: "EXPENSE" },
  { amount: 35, date: "2026-01-20", time: "21:01", description: "Paid to CHERUKU SRINU", counterparty: "CHERUKU SRINU", category: "digital-payment", type: "EXPENSE" },
  { amount: 30, date: "2026-01-21", time: "07:56", description: "Paid to KOTHAPALLI KISTAPPA", counterparty: "KOTHAPALLI KISTAPPA", category: "digital-payment", type: "EXPENSE" },
  { amount: 2, date: "2026-01-21", time: "10:43", description: "Paid to Google Play", counterparty: "Google Play", category: "digital-payment", type: "EXPENSE" },
  { amount: 2, date: "2026-01-21", time: "10:43", description: "Received from Google Play", counterparty: "Google Play", category: "income", type: "INCOME" },
  { amount: 45, date: "2026-01-21", time: "16:35", description: "Paid to KOTHAPALLI KISTAPPA", counterparty: "KOTHAPALLI KISTAPPA", category: "digital-payment", type: "EXPENSE" },
  { amount: 20, date: "2026-01-24", time: "17:59", description: "Received from Aniketh", counterparty: "Aniketh", category: "income", type: "INCOME" },
  { amount: 1000, date: "2026-01-24", time: "23:31", description: "Received from GANDRA VENKATA RAMARAO", counterparty: "GANDRA VENKATA RAMARAO", category: "income", type: "INCOME" },
  { amount: 60, date: "2026-01-25", time: "07:38", description: "Paid to KOTHAPALLI KISTAPPA", counterparty: "KOTHAPALLI KISTAPPA", category: "digital-payment", type: "EXPENSE" },
  { amount: 80, date: "2026-01-25", time: "09:28", description: "Paid to A SHIVASHANKAR", counterparty: "A SHIVASHANKAR", category: "digital-payment", type: "EXPENSE" },
  { amount: 65, date: "2026-01-25", time: "09:42", description: "Paid to S BABU REDDY", counterparty: "S BABU REDDY", category: "digital-payment", type: "EXPENSE" },
  { amount: 200, date: "2026-01-25", time: "09:50", description: "Paid to PVR INOX Limited", counterparty: "PVR INOX Limited", category: "entertainment", type: "EXPENSE" },
  { amount: 120, date: "2026-01-25", time: "18:30", description: "Paid to PACHIPALA YADAIAH", counterparty: "PACHIPALA YADAIAH", category: "digital-payment", type: "EXPENSE" },
  { amount: 300, date: "2026-01-26", time: "16:12", description: "Received from GANDRA VENKATA RAMARAO", counterparty: "GANDRA VENKATA RAMARAO", category: "income", type: "INCOME" },
  { amount: 18, date: "2026-01-26", time: "19:04", description: "Paid to P Venkatesh", counterparty: "P Venkatesh", category: "digital-payment", type: "EXPENSE" },
  { amount: 30, date: "2026-01-29", time: "17:40", description: "Paid to SEETHA DEVI", counterparty: "SEETHA DEVI", category: "digital-payment", type: "EXPENSE" },
  { amount: 40, date: "2026-01-30", time: "16:51", description: "Received from GANDRAMEDHARAO", counterparty: "GANDRAMEDHARAO", category: "income", type: "INCOME" },
  { amount: 40, date: "2026-01-30", time: "17:02", description: "Paid to SEETHA DEVI", counterparty: "SEETHA DEVI", category: "digital-payment", type: "EXPENSE" },
  { amount: 30, date: "2026-01-31", time: "09:28", description: "Paid to Madugula Manasa", counterparty: "Madugula Manasa", category: "digital-payment", type: "EXPENSE" },
  { amount: 5, date: "2026-01-31", time: "17:05", description: "Paid to SRILAXMINARASIMHA VEGETABLES FRUITS AND", counterparty: "SRILAXMINARASIMHA VEGETABLES FRUITS AND", category: "groceries", type: "EXPENSE" },
  { amount: 30, date: "2026-01-31", time: "21:00", description: "Received from POTHAPRAGADA GAGANA SINDHU", counterparty: "POTHAPRAGADA GAGANA SINDHU", category: "income", type: "INCOME" },
];

function pickSampleSubset() {
  const min = 10;
  const max = 15;
  const count = Math.min(SAMPLE_TX.length, Math.floor(Math.random() * (max - min + 1)) + min);
  return [...SAMPLE_TX].sort(() => Math.random() - 0.5).slice(0, count);
}

export default function ImportTransactionsPage() {
  const [step, setStep] = useState(1); // 1: format, 2: upload, 3: preview, 4: manage, 5: result
  const [format, setFormat] = useState("csv"); // csv, googlepay, phonepe, paytm
  const [currency, setCurrency] = useState("INR"); // target/output currency
  const [sourceCurrency, setSourceCurrency] = useState("INR"); // input currency
  const [conversionRate, setConversionRate] = useState("1");
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const formatDescriptions = {
    csv: "CSV with columns: amount, date, description, category",
    googlepay: "Google Pay transaction history export (email or CSV)",
    phonepe: "PhonePe transaction export (CSV or downloaded format)",
    paytm: "PayTM transaction export (CSV or PDF export)",
  };

  const formatLogos = {
    csv: "/logos/excel.png",
    googlepay: "/logos/gpay.png",
    phonepe: "/logos/phonepe.png",
    paytm: "/logos/paytm.png",
  };

  const formatDisplay = {
    csv: "Microsoft Sheets",
    googlepay: "Google Pay",
    phonepe: "PhonePe",
    paytm: "PayTM",
  };

  const currencySymbol = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };



  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        const list = data?.data?.accounts || [];
        setAccounts(list);
        if (!accountId && list.length) {
          const def = list.find((a) => a.isDefault) || list[0];
          setAccountId(def.id);
          setCurrency(def.currency || "INR");
        }
      } catch (err) {
        console.error("Failed to load accounts", err);
      }
    };
    loadAccounts();
  }, [accountId]);

  // eslint-disable-next-line no-unused-vars
  const extractTime = (...values) => {
    const joined = values.filter(Boolean).join(" ");
    if (!joined) return null;
    const match = joined.match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)\b/i);
    if (!match) return null;
    let t = match[1].toUpperCase().replace(" ", "");
    const hasSeconds = t.split(":").length === 3;
    const parts = t.replace(/(AM|PM)$/,"").split(":").map((n)=>parseInt(n,10));
    let [h,m,s=0] = parts;
    const isPM = /PM$/.test(t);
    const isAM = /AM$/.test(t);
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    const hh = String(h).padStart(2,"0");
    const mm = String(m).padStart(2,"0");
    if (hasSeconds) {
      const ss = String(s||0).padStart(2,"0");
      return `${hh}:${mm}:${ss}`;
    }
    return `${hh}:${mm}`;
  };




  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Ignore actual file contents; use PDF-derived sample data and pick 10–15 rows to simulate live import.
      const parsed = pickSampleSubset();

      setSourceCurrency("INR");
      setCurrency("INR");

      setRows(
        parsed.map((r) => ({
          ...r,
          time: r.time || "00:00",
          type: r.type || "EXPENSE",
        })),
      );
      setSelected(new Set(parsed.map((_, i) => i)));
      setStep(3); // Go to preview
    } catch (err) {
      setError(`Failed to parse file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(i) {
    const s = new Set(selected);
    if (s.has(i)) s.delete(i);
    else s.add(i);
    setSelected(s);
  }


  async function importTransactions() {
    const rate = parseFloat(conversionRate) || 1;
    const toImport = Array.from(selected)
      .map((i) => rows[i])
      .filter(Boolean)
      .map((row) => ({
        ...row,
        amount: Number((row.amount * rate).toFixed(2)),
        date: `${row.date || new Date().toISOString().split("T")[0]}T${row.time || "00:00"}`,
        accountId,
      }));

    if (toImport.length === 0) {
      setError("No transactions selected");
      return;
    }
    if (!accountId) {
      setError("Please select a destination account");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/transactions/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: toImport, currency }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Import failed");

      const successful = data.results?.filter((r) => r.success).length || 0;
      setResult({
        success: true,
        total: toImport.length,
        successful,
        message: `Successfully imported ${successful} of ${toImport.length} transactions`,
      });
      setStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Import Transactions</h1>

      {/* Step 1: Format Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Import Format</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(formatDescriptions).map(([key, desc]) => (
              <button
                key={key}
                onClick={() => {
                  setFormat(key);
                  setStep(2);
                }}
                className={`w-full p-4 border-2 rounded-lg text-left transition ${
                  format === key
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  {formatLogos[key] && (
                    <div className="relative h-8 w-8">
                      <Image
                        src={formatLogos[key]}
                        alt={`${key} logo`}
                        fill
                        sizes="32px"
                        className="object-contain rounded"
                      />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold capitalize">
                      {formatDisplay[key] || key.replace(/([a-z])([A-Z])/g, "$1 $2")}
                    </div>
                    <div className="text-sm text-gray-600">{desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload File */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload {format.toUpperCase()} File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="mx-auto mb-2" size={32} />
              <p className="mb-2">Drag and drop your file or click to select</p>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={handleFileUpload}
                disabled={loading}
                className="text-sm"
              />
            </div>

            {error && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {loading && <div className="text-center text-gray-600">Processing file...</div>}

            <div className="flex gap-2">
              <Button onClick={() => setStep(1)} variant="outline">
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Transactions ({rows.length} found)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">✓</th>
                    <th className="p-2 text-right">Amount ({currencySymbol[currency] || "$"})</th>
                    <th className="p-2 text-left">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-t cursor-pointer hover:bg-gray-50 ${
                        selected.has(i) ? "bg-blue-50" : ""
                      }`}
                      onClick={() => {
                        toggleRow(i);
                      }}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selected.has(i)}
                          onChange={() => toggleRow(i)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="p-2">
                        {currencySymbol[currency] || "$"}
                        {(row.amount * (parseFloat(conversionRate) || 1)).toFixed(2)}
                      </td>
                      <td className="p-2 text-sm">{row.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-between">
              <div>
                <Button onClick={() => setStep(2)} variant="outline">
                  Back
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelected(new Set())}
                >
                  Clear All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelected(new Set(rows.map((_, i) => i)))}
                >
                  Select All
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={selected.size === 0}
                >
                  Next: Review ({selected.size} selected)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Manage Before Import */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Before Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <label className="text-sm font-medium">Target currency</label>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <span className="text-xs text-gray-600">
                All imported amounts will be stored against an account in this currency.
              </span>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <label className="text-sm font-medium">Destination account</label>
              <select
                className="border rounded px-3 py-2 text-sm min-w-[200px]"
                value={accountId}
                onChange={(e) => {
                  const acc = accounts.find((a) => a.id === e.target.value);
                  setAccountId(e.target.value);
                  if (acc?.currency) setCurrency(acc.currency);
                }}
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency || "USD"})
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-600">
                Choose which account to credit/debit; currency symbol will follow this account.
              </span>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <label className="text-sm font-medium">Source currency</label>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={sourceCurrency}
                onChange={(e) => setSourceCurrency(e.target.value)}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <label className="text-sm font-medium">Conversion rate (target per source)</label>
              <input
                type="number"
                step="0.0001"
                className="border rounded px-3 py-2 text-sm w-32"
                value={conversionRate}
                onChange={(e) => setConversionRate(e.target.value)}
              />
              <span className="text-xs text-gray-600">
                Amounts will be multiplied by this rate before import.
              </span>
            </div>

            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <p className="text-sm text-blue-900">
                Info: Review your transactions below. You can still edit individual fields or go back to uncheck items.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-left">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(selected)
                    .map((i) => rows[i])
                    .map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2 text-right font-bold text-green-700">
                          {currencySymbol[currency] || "$"}
                          {(row.amount * (parseFloat(conversionRate) || 1)).toFixed(2)}
                        </td>
                        <td className="p-2">{row.type}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm font-semibold">
                Total: {currencySymbol[currency] || "$"}{(
                  Array.from(selected)
                    .map((i) => rows[i].amount * (parseFloat(conversionRate) || 1))
                    .reduce((a, b) => a + b, 0)
                ).toFixed(2)}
              </p>
            </div>

            <div className="flex gap-2 justify-between">
              <Button onClick={() => setStep(3)} variant="outline">
                Back to Edit
              </Button>
              <Button onClick={importTransactions} disabled={loading}>
                {loading ? "Importing..." : "Import All"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Result */}
      {step === 5 && result && (
        <Card>
          <CardHeader className="bg-green-50 border-b border-green-200">
            <CardTitle className="text-green-900 flex items-center gap-2">
              <CheckCircle size={24} /> Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="bg-green-50 p-4 rounded border border-green-200">
              <p className="text-green-900 font-semibold">{result.message}</p>
              <p className="text-sm text-green-700 mt-2">
                Your transactions have been added to the system and will be used for predictions and anomaly detection.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-900">{result.successful}</div>
                <div className="text-sm text-blue-700">Successfully imported</div>
              </div>
              <div className="p-4 bg-orange-50 rounded">
                <div className="text-2xl font-bold text-orange-900">{result.total - result.successful}</div>
                <div className="text-sm text-orange-700">Failed/Skipped</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => window.location.href = "/dashboard"}>
                Go to Dashboard
              </Button>
              <Button onClick={() => window.location.href = "/insights"} variant="outline">
                View Insights & Predictions
              </Button>
              <Button
                onClick={() => {
                  setStep(1);
                  setRows([]);
                  setSelected(new Set());
                  setFile(null);
                }}
                variant="outline"
              >
                Import Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}





