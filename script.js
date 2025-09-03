// ====== KONFIGURASI ======
const WHATSAPP_NUMBER = "6285743067554"; // ganti ke nomor tujuan (62...)

// ====== UTIL ======
const fmtIDR = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

// ====== ELEMEN UTAMA ======
const cards = document.querySelectorAll(".card");

// Popover cart
const cartFab = document.getElementById("cartFab");
const cartPopover = document.getElementById("cartPopover");
const closePopover = document.getElementById("closePopover");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const clearCartBtn = document.getElementById("clearCart");
const waCheckoutLink = document.getElementById("waCheckout");

// ====== STATE ======
let CART = {}; // { id: {id,name,price,qty} }

// ====== INIT: harga & hint di kartu ======
cards.forEach((card) => {
  const price = Number(card.dataset.price || 0);
  const priceEl = card.querySelector(".price");
  if (priceEl) priceEl.textContent = fmtIDR(price);

  // ubah hint jadi "Min 5" biar konsisten dengan aturan baru
  const hint = card.querySelector(".qty-hint");
  if (hint) hint.textContent = "Min 10";
});

// ====== DESKRIPSI TOGGLE ======
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("toggle-desc")) {
    const btn = e.target;
    const desc = btn.nextElementSibling;
    const expanded = btn.getAttribute("aria-expanded") === "true";
    desc.hidden = expanded;
    btn.setAttribute("aria-expanded", String(!expanded));
    btn.textContent = expanded ? "Lihat detail" : "Sembunyikan";
  }
});

// ====== QTY + / − (kartu) ======
// Aturan MINIMAL 5:
// - Klik + pertama: 0 -> 5
// - Setelah itu: naik normal (6,7,...)
// - Saat menurun: kalau qty <= 5 -> langsung 0 (hapus dari keranjang)
document.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;

  const id = card.dataset.id;
  const name = card.querySelector("h3")?.textContent?.trim() || id;
  const price = Number(card.dataset.price || 0);
  const qtySpan = card.querySelector(".qty");

  if (e.target.classList.contains("plus")) {
    const current = CART[id]?.qty || 0;
    const next = current === 0 ? 10 : current + 1; // mulai dari 5
    setCartItem(id, { id, name, price, qty: next });
    qtySpan.textContent = next;
  }

  if (e.target.classList.contains("minus")) {
    const current = CART[id]?.qty || 0;
    let next;
    if (current <= 10) {
      next = 0; // kalau turun ke 5 atau kurang, anggap batal beli
    } else {
      next = current - 1;
    }
    setCartItem(id, { id, name, price, qty: next });
    qtySpan.textContent = next;
  }
});

// ====== SINKRON QTY DI KARTU ======
function syncCardQtyFromCart() {
  cards.forEach((card) => {
    const id = card.dataset.id;
    const qtySpan = card.querySelector(".qty");
    qtySpan.textContent = CART[id]?.qty || 0;
  });
}

// ====== MUTASI CART ======
function setCartItem(id, item) {
  if (!item || item.qty <= 0) delete CART[id];
  else CART[id] = item;
  renderCart();
  updateBadge();
}

// ====== BADGE ======
function updateBadge() {
  const totalQty = Object.values(CART).reduce((a, b) => a + b.qty, 0);
  cartCount.textContent = totalQty;
}

// ====== RENDER CART ======
function renderCart() {
  cartItemsEl.innerHTML = "";
  const items = Object.values(CART);

  if (items.length === 0) {
    cartItemsEl.innerHTML = `<p>Keranjang masih kosong. Yuk pilih jajanan dulu! <br>😊</p>`;
    cartTotalEl.textContent = "Rp0";
    updateWALink();
    syncCardQtyFromCart();
    return;
  }

  let total = 0;
  items.forEach((it) => {
    const line = it.price * it.qty;
    total += line;

    const itemEl = document.createElement("div");
    itemEl.className = "cart-item";
    itemEl.innerHTML = `
      <div>
        <h4>${it.name}</h4>
        <div class="cart-line">${fmtIDR(it.price)} × ${it.qty} = <strong>${fmtIDR(line)}</strong></div>
      </div>
      <div class="cart-qty-controls">
        <button class="tiny" data-act="dec" data-id="${it.id}" aria-label="Kurangi">−</button>
        <span>${it.qty}</span>
        <button class="tiny" data-act="inc" data-id="${it.id}" aria-label="Tambah">+</button>
      </div>
    `;
    cartItemsEl.appendChild(itemEl);
  });

  cartTotalEl.textContent = fmtIDR(total);
  updateWALink();
  syncCardQtyFromCart();
}

// ====== KONTROL QTY DARI POPOVER (MIN 5) ======
cartItemsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button.tiny");
  if (!btn) return;
  const id = btn.dataset.id;
  const act = btn.dataset.act;
  const item = CART[id];
  if (!item) return;

  if (act === "inc") {
    item.qty = item.qty === 0 ? 5 : item.qty + 1;
  }
  if (act === "dec") {
    if (item.qty <= 10 ) item.qty = 0;
    else item.qty = item.qty - 1;
  }
  setCartItem(id, item);
});

// ====== CLEAR CART ======
clearCartBtn.addEventListener("click", () => {
  CART = {};
  renderCart();
  updateBadge();
});

// ====== WHATSAPP LINK ======
function updateWALink() {
  const items = Object.values(CART);
  if (items.length === 0) {
    waCheckoutLink.href = "#";
    waCheckoutLink.setAttribute("aria-disabled", "true");
    return;
  }

  const date = new Date();
  const tanggalID = date.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines = items.map(
    (it) => `• ${it.name} — ${it.qty} x ${fmtIDR(it.price)} = ${fmtIDR(it.price * it.qty)}`
  );
  const total = items.reduce((a, b) => a + b.price * b.qty, 0);

  const pesan = `Halo Kak Kuliner Kenangan, saya ingin pesan:
${lines.join("\n")}
Total: ${fmtIDR(total)}

Nama:
Alamat:
Catatan:

Tanggal: ${tanggalID}
Terima kasih 🙏`;

  waCheckoutLink.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(pesan)}`;
  waCheckoutLink.removeAttribute("aria-disabled");
}

// ====== POPOVER OPEN/CLOSE ======
function openPopover() {
  cartPopover.hidden = false;
  cartPopover.setAttribute("aria-open", "true");
  cartFab.setAttribute("aria-expanded", "true");
}
function closePopoverUI() {
  cartPopover.setAttribute("aria-open", "false");
  cartFab.setAttribute("aria-expanded", "false");
  // delay kecil agar animasi fade-out terlihat
  setTimeout(() => {
    cartPopover.hidden = true;
  }, 180);
}

// Toggle dari tombol 🧺
cartFab.addEventListener("click", () => {
  const isOpen = cartPopover.getAttribute("aria-open") === "true";
  if (isOpen) closePopoverUI();
  else openPopover();
});

// Tombol X
closePopover.addEventListener("click", () => closePopoverUI());

// Tutup saat klik di luar
document.addEventListener("click", (e) => {
  const isOpen = cartPopover.getAttribute("aria-open") === "true";
  if (!isOpen) return;
  const clickInside = cartPopover.contains(e.target) || cartFab.contains(e.target);
  if (!clickInside) closePopoverUI();
});

// Tutup dengan ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const isOpen = cartPopover.getAttribute("aria-open") === "true";
    if (isOpen) closePopoverUI();
  }
});

// ====== SHOW CONTACT (untuk tombol di section Kontak) ======
function showContact() {
  const contact = document.getElementById("contactInfo");
  contact.style.display =
    contact.style.display === "none" || contact.style.display === "" ? "block" : "none";
}
window.showContact = showContact; // agar bisa dipanggil dari HTML

// ====== STARTUP ======
// Pastikan semua link WA pakai nomormu
function bindDirectWALinks() {
  const normalize = (n) => n.replace(/\D/g, '').replace(/^0/, '62'); // buang spasi/tanda & ganti 0 depan -> 62
  const PHONE = normalize(WHATSAPP_NUMBER || "6285743067554");

  document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com/send"], [data-wa="direct"]').forEach(a => {
    // Ambil pesan dari href lama atau dari data attribute
    let url = new URL(a.getAttribute('href') || window.location.href, window.location.origin);
    let msg = a.dataset.waMsg || url.searchParams.get('text') || "";

    // Tulis ulang href ke format wa.me yang bersih
    a.href = `https://wa.me/${PHONE}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
    a.target = "_blank";
    a.rel = "noopener";
  });
}

renderCart();
updateBadge();
bindDirectWALinks();
