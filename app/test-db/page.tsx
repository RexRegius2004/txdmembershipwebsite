import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

async function DatabaseTest() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("seasons")
    .select("*");

  if (error) {
    return (
      <pre className="mt-4 rounded bg-red-100 p-4 text-red-700">
        {JSON.stringify(error, null, 2)}
      </pre>
    );
  }

  return (
    <pre className="mt-4 rounded bg-gray-100 p-4">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function TestDatabase() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">
        Database Test
      </h1>

      <p className="mt-2 text-gray-600">
        Testing connection to Supabase...
      </p>

      <Suspense
        fallback={
          <p className="mt-4">
            Loading database...
          </p>
        }
      >
        <DatabaseTest />
      </Suspense>
    </main>
  );
}