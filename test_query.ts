import { getDashboardStats } from './lib/actions/pos';

async function run() {
  try {
    const stats = await getDashboardStats();
    console.log("Success:", stats);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
