import bootstrap from "./server.ts";

if (import.meta.main) {
  console.log("This is IPsaur!");
  try {
    bootstrap();
  } catch (err) {
    console.error("FATAL", (err as Error).toString());
    Deno.exit(1);
  }
}
