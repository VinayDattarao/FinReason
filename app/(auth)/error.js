"use client";

export default function AuthError({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <pre className="bg-red-100 text-red-800 p-4 rounded whitespace-pre-wrap max-w-full">
        {error?.message || String(error)}
      </pre>
      <button
        onClick={() => reset()}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
