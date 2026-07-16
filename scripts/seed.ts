import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { buildSeed } from "../src/data/seed";

// Same Firebase config as src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyCrYcli7cOZGeCsZHumY19EkLckhDC2vd8",
  authDomain: "padelivo.firebaseapp.com",
  projectId: "padelivo",
  storageBucket: "padelivo.firebasestorage.app",
  messagingSenderId: "640319213717",
  appId: "1:640319213717:web:fb31160144de30d0bb8b9c",
  measurementId: "G-5TRQ04XPQE",
};

const app = initializeApp(firebaseConfig, "seed");
const db = getFirestore(app);

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

async function seedCollection<T extends { id: string }>(
  collectionName: string,
  items: T[],
): Promise<void> {
  let success = 0;
  for (const item of items) {
    const { id, ...data } = item;
    const ref = doc(db, collectionName, id);
    await setDoc(ref, stripUndefined(data as Record<string, unknown>));
    success++;
  }
  console.log(`  ✓ Uploaded ${success} documents to "${collectionName}"`);
}

async function main() {
  console.log("🌱 Seeding Firestore…\n");

  const { courts, customers, bookings, payments, activity, maintenanceSlots } =
    buildSeed();

  await seedCollection("courts", courts);
  await seedCollection("customers", customers);
  await seedCollection("bookings", bookings);
  await seedCollection("payments", payments);
  await seedCollection("activity", activity);
  await seedCollection("maintenanceSlots", maintenanceSlots);

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});