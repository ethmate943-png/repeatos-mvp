// Using global fetch

const API_BASE = 'http://localhost:3001';
const TOKEN = 'demo-token-1234';
const PHONE = '08012345678';

async function test() {
  console.log("--- Phase 3: Loyalty Lifecycle Test ---");

  // 1. Scan (Check-in)
  console.log("\n1. Scanning QR...");
  const scanRes = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: TOKEN, phone: PHONE })
  });
  const scanData = await scanRes.json();
  console.log("Scan Result:", scanData);

  // 2. Create Order
  console.log("\n2. Creating Order...");
  const orderRes = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: TOKEN,
      phone: PHONE,
      items: [{ id: 'itm_1', name: 'Espresso', quantity: 2, priceKobo: 240000 }],
      totalKobo: 240000
    })
  });
  const orderData: any = await orderRes.json();
  console.log("Order Created:", orderData.id);

  // 3. Admin: Accept Order (Trigger Points)
  console.log("\n3. Admin: Accepting Order...");
  const acceptRes = await fetch(`${API_BASE}/admin/orders/${orderData.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'accepted' })
  });
  const acceptData = await acceptRes.json();
  console.log("Order Accepted Status:", acceptData.status);

  // 4. Verify Loyalty Status
  console.log("\n4. Verifying Loyalty Status...");
  const statusRes = await fetch(`${API_BASE}/loyalty/status?token=${TOKEN}&phone=${PHONE}`);
  const statusData = await statusRes.json();
  console.log("Loyalty Status:", JSON.stringify(statusData, null, 2));

  if (statusData.balance > 0 || statusData.vouchers.length > 0) {
    console.log("\nSUCCESS: Points or Vouchers awarded!");
  } else {
    console.log("\nFAILURE: No points awarded. Check business loyalty_config.");
  }
}

test().catch(console.error);
