"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  priceKobo: number;
  category?: string;
}

export default function BusinessMenuPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ id: string; name: string; quantity: number; priceKobo: number }[]>([]);
  const [businessName, setBusinessName] = useState("Loading...");

  useEffect(() => {
    // In a real app, we'd fetch business and menu from the API
    // For now, we'll use our seeded demo data or mock it
    const fetchMenu = async () => {
      try {
        // Mock fetch based on the demo business we seeded
        setBusinessName(slug === 'blisscafe' ? "Bliss Cafe" : slug.toUpperCase());
        setItems([
          { id: "itm_1", name: "Espresso", description: "Rich, bold, and energizing.", priceKobo: 120000, category: "Coffee" },
          { id: "itm_2", name: "Croissant", description: "Buttery, flaky, and golden.", priceKobo: 150000, category: "Pastries" },
          { id: "itm_3", name: "Latte", description: "Creamy and smooth.", priceKobo: 180000, category: "Coffee" },
          { id: "itm_4", name: "Sourdough Toast", description: "With artisanal jam.", priceKobo: 220000, category: "Breakfast" },
        ]);
      } catch (err) {
        console.error("Failed to fetch menu", err);
      }
    };
    fetchMenu();

    // Initialize Widget
    const script = document.createElement('script');
    script.src = 'http://localhost:3001/public/widget.iife.js';
    (window as any).REPEATOS_CONFIG = {
      widgetId: 'demo-widget-id',
      apiUrl: 'http://localhost:3001',
      token: 'demo-token-1234'
    };
    document.head.appendChild(script);
  }, [slug]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: item.id, name: item.name, quantity: 1, priceKobo: item.priceKobo }];
    });
  };

  const totalKobo = cart.reduce((sum, item) => sum + item.priceKobo * item.quantity, 0);

  const placeOrder = async () => {
    const phone = prompt("Enter your phone number to place the order:");
    if (!phone) return;

    try {
      const res = await fetch('http://localhost:3001/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'demo-token-1234',
          phone,
          items: cart,
          totalKobo
        })
      });
      if (res.ok) {
        alert("Order placed successfully! Check the widget for points.");
        setCart([]);
        // Optional: refresh widget state if exposed
      } else {
        alert("Order placement failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error placing order.");
    }
  };

  const categories = Array.from(new Set(items.map((i) => i.category || "General")));

  return (
    <div className="min-h-screen pb-32">
      <header className="py-12 px-6 border-b-4 border-black mb-12">
        <div className="max-w-4xl mx-auto flex justify-between items-baseline">
          <h1 className="text-4xl md:text-6xl font-black">{businessName}</h1>
          <p className="text-sm font-bold opacity-50 tracking-widest uppercase">Menu</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6">
        {categories.map((cat) => (
          <section key={cat} className="mb-16">
            <h2 className="text-2xl font-black border-b-2 border-black inline-block mb-8">{cat}</h2>
            <div className="space-y-0">
              {items
                .filter((item) => (item.category || "General") === cat)
                .map((item) => (
                  <div key={item.id} className="group flex justify-between items-end border-b-2 border-muted hover:border-black transition-colors py-8">
                    <div className="flex-1 pr-4">
                      <h3 className="text-xl font-bold uppercase">{item.name}</h3>
                      {item.description && <p className="text-sm opacity-60 max-w-sm mt-1">{item.description}</p>}
                    </div>
                    <div className="flex items-center gap-6">
                      <p className="text-xl font-black italic">₦{(item.priceKobo / 100).toLocaleString()}</p>
                      <button 
                         onClick={() => addToCart(item)}
                         className="bg-black text-white px-4 py-2 text-xs font-black uppercase hover:bg-accent hover:text-white transition-colors"
                      >
                         Add
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </main>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t-8 border-black z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div>
              <p className="text-xs font-black uppercase opacity-50">Current Order</p>
              <p className="text-3xl font-black italic">₦{(totalKobo / 100).toLocaleString()}</p>
            </div>
            <button 
              onClick={placeOrder}
              className="bg-black text-white px-8 py-4 font-black uppercase text-xl hover:bg-accent transition-colors"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
      {/* Widget Container */}
      <div id="repeatos-widget"></div>
    </div>
  );
}
