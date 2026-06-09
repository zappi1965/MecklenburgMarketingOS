import Stripe from "stripe";
import { TOOLS } from "../src/lib/tools";

/**
 * Idempotently creates a Stripe Product + monthly recurring Price for every
 * tool in the catalogue and prints the STRIPE_PRICE_* env lines to paste into
 * your environment.
 *
 *   npm run stripe:setup
 */

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("STRIPE_SECRET_KEY is not set.");
    process.exit(1);
  }
  const stripe = new Stripe(key, { typescript: true });

  // Index existing products by our tool_key metadata.
  const existingProducts = new Map<string, Stripe.Product>();
  for await (const product of stripe.products.list({ limit: 100 })) {
    const toolKey = product.metadata?.mmos_tool_key;
    if (toolKey) existingProducts.set(toolKey, product);
  }

  const envLines: string[] = [];

  for (const tool of TOOLS) {
    // Product.
    let product = existingProducts.get(tool.key);
    if (!product) {
      product = await stripe.products.create({
        name: `MMOS · ${tool.name}`,
        description: tool.description,
        metadata: { mmos_tool_key: tool.key },
      });
      console.log(`  created product for ${tool.key}: ${product.id}`);
    } else {
      console.log(`  product exists for ${tool.key}: ${product.id}`);
    }

    // Reuse a matching active monthly EUR price, else create one.
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });
    let price = prices.data.find(
      (p) =>
        p.currency === "eur" &&
        p.unit_amount === tool.priceCents &&
        p.recurring?.interval === "month",
    );
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: "eur",
        unit_amount: tool.priceCents,
        recurring: { interval: "month" },
        metadata: { mmos_tool_key: tool.key },
      });
      console.log(`  created price for ${tool.key}: ${price.id}`);
    }

    envLines.push(`${tool.stripePriceEnv}=${price.id}`);
  }

  console.log("\n# --- Paste into your environment ---");
  console.log(envLines.join("\n"));
}

main().catch((err) => {
  console.error("Stripe setup failed:", err);
  process.exit(1);
});
