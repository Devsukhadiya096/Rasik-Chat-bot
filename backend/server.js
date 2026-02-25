import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const CONTACT = "98259 73819";
const ADDRESS = "Santok Bhuvan, Near Bank of India, Ramnagar, Sabarmati, Ahmedabad – 380005";
const MAP_LINK = "https://share.google/1fXo7PwffO3KO4FEI";

/* ---------------- PRODUCTS ---------------- */

const SWEETS = [
  { name: "Kaju Katli", price: 900 },
  { name: "Kaju Roll", price: 1000 },
  { name: "Motichoor Laddu", price: 600 },
  { name: "Milk Cake", price: 480 },
  { name: "Mohanthal", price: 600 },
  { name: "Mysore Pak", price: 650 }
];

const NAMKEEN = [
  { name: "Sev", price: 380 },
  { name: "Ratlam Sev", price: 420 },
  { name: "Aloo Bhujia", price: 420 },
  { name: "Chavanu", price: 420 },
  { name: "Wafers", price: 360 },
  { name: "Chevdo", price: 420 }
];

const FARSAN = [
  { name: "Fafda", price: 420 },
  { name: "Gathiya", price: 400 },
  { name: "Khaman", price: 300 },
  { name: "Dhokla", price: 280 },
  { name: "Patra", price: 350 }
];

let cart = [];

/* ---------------- HELPERS ---------------- */

function getWeight(msg, itemName) {
  if (msg.includes("250")) return 0.25;
  if (msg.includes("500")) return 0.5;
  if (msg.includes("1kg") || msg.includes("1 kg")) return 1;

  const namkeenWords = ["sev","bhujia","chavanu","wafers","chevdo"];
  if (namkeenWords.some(n => itemName?.toLowerCase().includes(n))) {
    return 0.25;
  }
  return 1;
}

function weightLabel(w) {
  if (w === 1) return "1kg";
  if (w === 0.5) return "500g";
  return "250g";
}

/* fuzzy item matching (handles typos) */
function findItem(msg) {
  const all = [...SWEETS, ...NAMKEEN, ...FARSAN];

  return all.find(i => {
    const name = i.name.toLowerCase();
    return (
      msg.includes(name) ||
      msg.includes(name.replace(" ", "")) ||
      name.split(" ").some(word => msg.includes(word))
    );
  });
}

/* ---------------- ROUTE ---------------- */

app.post("/chat", (req, res) => {
  try {
    const msg = (req.body.message || "").toLowerCase().trim();

    /* ----- GREETING ----- */
    if (/^(hi|hello|hey|namaste)\b/.test(msg)) {
      return res.json({
        reply:
          "Namaste! I can help with sweets, namkeen, prices, orders, catering, or shop details. What would you like?"
      });
    }

    /* ----- CONTACT ----- */
    if (msg.includes("contact") || msg.includes("number") || msg.includes("phone")) {
      return res.json({ reply: CONTACT });
    }

    /* ----- LOCATION ----- */
    if (msg.includes("address") || msg.includes("location") || msg.includes("map") || msg.includes("where")) {
      return res.json({
        reply: `${ADDRESS}\n\nOpen in Google Maps:\n${MAP_LINK}`
      });
    }

    /* ----- CATERING ----- */
    if (msg.includes("catering") || msg.includes("bulk") || msg.includes("party") || msg.includes("function")) {
      return res.json({
        reply: "Yes, we provide catering for weddings, parties, and bulk orders. Please call 98259 73819 for details."
      });
    }

    /* ----- LISTS ----- */
    if (msg.includes("sweet")) {
      return res.json({ reply: "Available sweets:\n\n" + SWEETS.map(i => i.name).join("\n") });
    }

    if (msg.includes("namkeen")) {
      return res.json({ reply: "Available namkeen:\n\n" + NAMKEEN.map(i => i.name).join("\n") });
    }

    if (msg.includes("farsan")) {
      return res.json({ reply: "Available farsan:\n\n" + FARSAN.map(i => i.name).join("\n") });
    }

    const found = findItem(msg);

    /* ----- ADD ITEM ----- */
    if ((msg.includes("add") || msg.includes("want")) && found) {
      const weight = getWeight(msg, found.name);
      const price = Math.round(found.price * weight);
      cart.push({ name: found.name, weight, price });

      return res.json({
        reply: `${weightLabel(weight)} ${found.name} added to your order.`
      });
    }

    /* ----- REMOVE ITEM ----- */
    if (msg.includes("remove")) {

      if (msg.includes("last") && cart.length > 0) {
        const removed = cart.pop();
        return res.json({
          reply: `${weightLabel(removed.weight)} ${removed.name} removed from your order.`
        });
      }

      if (found) {
        const weight = getWeight(msg, found.name);
        const index = cart.findIndex(i => i.name === found.name && i.weight === weight);

        if (index !== -1) {
          cart.splice(index, 1);
          return res.json({
            reply: `${weightLabel(weight)} ${found.name} removed from your order.`
          });
        }
      }

      return res.json({ reply: "Tell me which item to remove." });
    }

    /* ----- SHOW ORDER ----- */
    if (msg.includes("order") || msg.includes("cart")) {
      if (cart.length === 0) return res.json({ reply: "Your order is empty." });

      const list = cart.map(i =>
        `${weightLabel(i.weight)} ${i.name} – ₹${i.price}`
      ).join("\n");

      const total = cart.reduce((sum, i) => sum + i.price, 0);

      return res.json({
        reply: `Your order:\n\n${list}\n\nTotal: ₹${total}`
      });
    }

    /* ----- CLEAR ORDER ----- */
    if (msg.includes("clear") || msg.includes("cancel order")) {
      cart = [];
      return res.json({ reply: "Your order has been cleared." });
    }

    /* ----- PRICE CHECK ----- */
    if (found) {
      const weight = getWeight(msg, found.name);
      const price = Math.round(found.price * weight);

      return res.json({
        reply: `${weightLabel(weight)} of ${found.name} costs ₹${price}.`
      });
    }

    /* ----- STRICT FINAL FALLBACK ----- */
    return res.json({
      reply:
        "I can help only with Rasik Mithai Ghar services.\n\n" +
        "Ask about sweets, namkeen, prices, orders, catering, or shop details."
    });

  } catch (err) {
    console.error("SERVER CRASH:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(5001, () => {
  console.log("Chatbot server running on 5001");
});