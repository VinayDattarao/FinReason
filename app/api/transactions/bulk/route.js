import { createTransaction } from '@/actions/transaction';

export async function POST(req) {
  try {
    const { transactions } = await req.json();
    if (!Array.isArray(transactions)) {
      return new Response(JSON.stringify({ error: 'transactions must be an array' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const results = [];
    for (const t of transactions) {
      try {
        // createTransaction is a server action; call it for each transaction
        const res = await createTransaction(t);
        results.push({ success: true, data: res.data });
      } catch (err) {
        results.push({ success: false, error: String(err.message || err) });
      }
    }

    return new Response(JSON.stringify({ results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
