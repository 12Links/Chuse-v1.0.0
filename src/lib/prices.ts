// src/lib/prices.ts
import { db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function getPricesForProduct(productId: string) {
  const q = query(
    collection(db, "PricePoint"),
    where("productId", "==", productId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
