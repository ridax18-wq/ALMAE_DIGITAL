import { bloques } from "./contenidos-data.mjs";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

for (const [block_key, body] of Object.entries(bloques)) {
  const { error } = await supabase
    .from("content_blocks")
    .upsert({ block_key, body, status: "published" }, { onConflict: "block_key" });
  if (error) {
    console.error(block_key, error.message);
    process.exitCode = 1;
  } else {
    console.log(block_key, "ok");
  }
}
