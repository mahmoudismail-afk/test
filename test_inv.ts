import { getProducts, updateProduct, deleteProduct, restockProduct } from './lib/actions/products.ts';

(async () => {
  console.log("Testing getProducts...");
  const p = await getProducts();
  console.log("Got products:", p.length);
  if (p.length === 0) return;

  const id = p[0].id;

  console.log("Testing restockProduct...");
  const r1 = await restockProduct({ product_id: id, quantity: 5, cost_per_unit: 10 });
  console.log(r1);

  console.log("Testing updateProduct...");
  const r2 = await updateProduct(id, { ...p[0], stock_qty: p[0].stock_qty + 1 });
  console.log(r2);

  console.log("Testing deleteProduct...");
  const r3 = await deleteProduct(id);
  console.log(r3);
})();
