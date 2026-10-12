const icons = { bola: "◉", raket: "⌁", sepatu: "⌑", jersey: "▤", alat: "◈" };
const demoProducts = [
  { id: "demo-1", name: "Bola Basket Molten BG4500", sku: "BKT-001", category: "Bola", supplier: "Sportindo Jaya", stock: 24, min_stock: 8, unit: "pcs", price: 685000 },
  { id: "demo-2", name: "Raket Badminton Carbon Pro", sku: "BDM-014", category: "Raket", supplier: "Prima Atletik", stock: 6, min_stock: 10, unit: "pcs", price: 425000 },
  { id: "demo-3", name: "Sepatu Futsal Flex Court", sku: "FUT-008", category: "Sepatu", supplier: "Sportindo Jaya", stock: 18, min_stock: 6, unit: "pasang", price: 579000 },
  { id: "demo-4", name: "Jersey Training Pro", sku: "JRS-023", category: "Pakaian", supplier: "Nusantara Sport", stock: 0, min_stock: 5, unit: "pcs", price: 189000 },
  { id: "demo-5", name: "Bola Voli Mikasa V200W", sku: "VOL-006", category: "Bola", supplier: "Prima Atletik", stock: 32, min_stock: 10, unit: "pcs", price: 895000 },
  { id: "demo-6", name: "Matras Yoga Eco Grip", sku: "FIT-011", category: "Fitness", supplier: "Nusantara Sport", stock: 14, min_stock: 5, unit: "pcs", price: 249000 },
];
const demoMovements = [
  { id: "mv-1", product_id: "demo-1", product_name: "Bola Basket Molten BG4500", movement_type: "in", quantity: 12, note: "Restock mingguan", created_at: new Date(Date.now() - 1000 * 60 * 48).toISOString() },
  { id: "mv-2", product_id: "demo-2", product_name: "Raket Badminton Carbon Pro", movement_type: "out", quantity: 4, note: "Penjualan", created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: "mv-3", product_id: "demo-3", product_name: "Sepatu Futsal Flex Court", movement_type: "in", quantity: 8, note: "Pembelian baru", created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() },
];

const state = { products: demoProducts, movements: demoMovements, view: "dashboard", connected: false, search: "", category: "Semua kategori" };
const content = document.querySelector("#app-content");
const authRoot = document.querySelector("#auth-root");
const supabaseConfig = window.SUPABASE_CONFIG || {};
const sessionStorageKey = "sportstock-auth-session";
let session = null;
const categoryNames = () => ["Semua kategori", ...new Set(state.products.map((product) => product.category).filter(Boolean))];
const formatNumber = (value) => new Intl.NumberFormat("id-ID").format(value || 0);
const formatCurrency = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
const formatDate = (value) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const statusFor = (product) => product.stock <= 0 ? ["Habis", "out"] : product.stock <= product.min_stock ? ["Menipis", "low"] : ["Tersedia", ""];
const categoryIcon = (category = "") => /bola/i.test(category) ? icons.bola : /raket/i.test(category) ? icons.raket : /sepatu/i.test(category) ? icons.sepatu : /pakaian|jersey/i.test(category) ? icons.jersey : icons.alat;

function isSupabaseConfigured() {
  return Boolean(supabaseConfig.url && supabaseConfig.publishableKey && !supabaseConfig.publishableKey.startsWith("ISI_"));
}

async function authRequest(endpoint, body) {
  const response = await fetch(`${supabaseConfig.url.replace(/\/$/, "")}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: { apikey: supabaseConfig.publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "Autentikasi Supabase gagal.");
  return data;
}

function saveSession(nextSession) {
  session = { ...nextSession, expires_at: Date.now() + Number(nextSession.expires_in || 3600) * 1000 };
  localStorage.setItem(sessionStorageKey, JSON.stringify(session));
}

async function refreshSession() {
  if (!session?.refresh_token) return false;
  const nextSession = await authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
  saveSession(nextSession);
  return true;
}

async function api(path, options = {}) {
  const request = () => fetch(`${supabaseConfig.url.replace(/\/$/, "")}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: supabaseConfig.publishableKey,
      Authorization: `Bearer ${session?.access_token || ""}`,
      "Content-Type": "application/json",
      ...(options.method === "POST" ? { Prefer: "return=representation" } : {}),
      ...options.headers,
    },
  });
  let response = await request();
  if (response.status === 401 && await refreshSession()) response = await request();
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.details || data.hint || "Permintaan Supabase gagal.");
  return data;
}

function showAuth(message = "", mode = "signin", isError = false) {
  document.querySelector(".app-shell").hidden = true;
  document.querySelector("#sign-out").hidden = true;
  const configured = isSupabaseConfigured();
  const isSignup = mode === "signup";
  authRoot.innerHTML = `<main class="auth-screen"><section class="auth-card"><div class="auth-brand"><span class="brand-mark"><svg viewBox="0 0 32 32"><path d="M6 24 16 6l10 18H6Z"/><path d="m11 24 5-9 5 9M16 15v9"/></svg></span><span>sportstock</span></div><p class="eyebrow">RUANG KERJA</p><h1>${isSignup ? "Buat akun" : "Masuk ke Sportstock"}</h1><p class="auth-description">${isSignup ? "Daftarkan email dan kata sandi untuk mulai mengelola persediaan." : "Gunakan akun Supabase untuk mengakses persediaan."}</p>${configured ? `<form class="auth-form" id="auth-form"><div class="form-field"><label for="auth-email">Email</label><input class="field" id="auth-email" name="email" type="email" autocomplete="username" required /></div><div class="form-field"><label for="auth-password">Kata sandi</label><input class="field" id="auth-password" name="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" minlength="6" required /></div><p class="auth-message" id="auth-message" aria-live="polite"></p><button class="button button-primary" type="submit">${isSignup ? "Daftar" : "Masuk"}</button></form><button class="auth-switch" type="button" data-auth-mode="${isSignup ? "signin" : "signup"}">${isSignup ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}</button>` : `<p class="auth-message is-error">Isi URL proyek dan publishable key di frontend/supabase-config.js untuk mengaktifkan koneksi Supabase.</p>`}</section></main>`;
  if (configured) {
    authRoot.querySelector("#auth-form").addEventListener("submit", isSignup ? signUp : signIn);
    authRoot.querySelector("[data-auth-mode]").addEventListener("click", () => showAuth("", isSignup ? "signin" : "signup"));
    if (message) setAuthMessage(message, isError);
  }
}

function setAuthMessage(message, isError = false) {
  const element = authRoot.querySelector("#auth-message");
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

async function signIn(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const submit = event.currentTarget.querySelector("[type=submit]");
  submit.disabled = true;
  setAuthMessage("Menghubungkan ke Supabase...");
  try {
    saveSession(await authRequest("token?grant_type=password", values));
    await loadData();
  } catch (error) {
    setAuthMessage(error.message, true);
  } finally {
    submit.disabled = false;
  }
}

async function signUp(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const submit = event.currentTarget.querySelector("[type=submit]");
  submit.disabled = true;
  setAuthMessage("Membuat akun...");
  try {
    const result = await authRequest("signup", values);
    const nextSession = result.session || result;
    if (nextSession.access_token) {
      saveSession(nextSession);
      await loadData();
      return;
    }
    showAuth("Akun berhasil dibuat. Periksa email untuk konfirmasi, lalu masuk.", "signin");
  } catch (error) {
    setAuthMessage(error.message, true);
  } finally {
    submit.disabled = false;
  }
}

async function loadData() {
  const [products, movements] = await Promise.all([
    api("/products?select=*,categories(name),suppliers(name)&order=created_at.desc"),
    api("/stock_movements?select=*,products(name,sku)&order=created_at.desc&limit=100"),
  ]);
  state.products = products.map((product) => ({ ...product, category: product.categories?.name || "Lainnya", supplier: product.suppliers?.name || "-" }));
  state.movements = movements.map((movement) => ({ ...movement, product_name: movement.products?.name || "Barang" }));
  state.connected = true;
  authRoot.innerHTML = "";
  document.querySelector(".app-shell").hidden = false;
  document.querySelector("#sign-out").hidden = false;
  document.querySelector("#connection-label").textContent = "Supabase terhubung";
  document.querySelector(".connection-dot").classList.add("is-online");
  render();
}

async function initialize() {
  if (!isSupabaseConfigured()) {
    showAuth();
    return;
  }
  try {
    session = JSON.parse(localStorage.getItem(sessionStorageKey) || "null");
    if (session?.expires_at && session.expires_at < Date.now() + 30000) await refreshSession();
    if (!session?.access_token) {
      showAuth();
      return;
    }
    await loadData();
  } catch (error) {
    localStorage.removeItem(sessionStorageKey);
    session = null;
    showAuth(error.message);
  }
}

function pageHeading(eyebrow, title, subtitle, action = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="page-subtitle">${subtitle}</p></div>${action}</div>`;
}

function productRows(products, showSupplier = true) {
  if (!products.length) return `<tr><td class="empty-state" colspan="6">Belum ada barang yang cocok dengan pencarian.</td></tr>`;
  return products.map((product) => {
    const [status, klass] = statusFor(product);
    const color = product.category === "Bola" ? "orange" : product.category === "Raket" ? "blue" : product.category === "Pakaian" ? "yellow" : "";
    return `<tr><td><div class="product-cell"><span class="product-thumb ${color}">${categoryIcon(product.category)}</span><span><span class="product-name">${escapeHtml(product.name)}</span><span class="product-sku">${escapeHtml(product.sku)}</span></span></div></td><td>${escapeHtml(product.category || "-")}</td>${showSupplier ? `<td>${escapeHtml(product.supplier || "-")}</td>` : ""}<td class="stock-cell">${formatNumber(product.stock)} <span class="stock-unit">${escapeHtml(product.unit || "pcs")}</span></td><td><span class="status-pill ${klass}">${status}</span></td><td><button class="row-action" data-move-product="${escapeHtml(product.id)}">Catat mutasi</button></td></tr>`;
  }).join("");
}

function dashboardView() {
  const products = state.products;
  const low = products.filter((product) => product.stock > 0 && product.stock <= product.min_stock).length;
  const out = products.filter((product) => product.stock <= 0).length;
  const totalUnits = products.reduce((total, product) => total + Number(product.stock || 0), 0);
  const stockValue = products.reduce((total, product) => total + Number(product.stock || 0) * Number(product.price || 0), 0);
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))].map((name) => ({ name, count: products.filter((product) => product.category === name).length })).sort((a, b) => b.count - a.count).slice(0, 5);
  const max = Math.max(1, ...categories.map((category) => category.count));
  const latest = [...state.movements].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
  return `${pageHeading("Ikhtisar operasional", "Ringkasan persediaan", "Pantau stok dan aktivitas perlengkapan olahraga.", `<button class="button button-primary" data-action="movement"><span class="button-icon">＋</span>Catat mutasi</button>`)}
    <div class="metrics-grid">
      <article class="metric-card"><div class="metric-top"><span>Total jenis barang</span><span class="metric-symbol">▦</span></div><strong class="metric-value">${formatNumber(products.length)}</strong><span class="metric-note">${formatNumber(totalUnits)} unit dalam persediaan</span></article>
      <article class="metric-card"><div class="metric-top"><span>Nilai persediaan</span><span class="metric-symbol">Rp</span></div><strong class="metric-value">${formatCurrency(stockValue)}</strong><span class="metric-note">Berdasarkan harga barang</span></article>
      <article class="metric-card warning"><div class="metric-top"><span>Stok menipis</span><span class="metric-symbol">↘</span></div><strong class="metric-value">${formatNumber(low)}</strong><span class="metric-note">Perlu dipertimbangkan untuk restock</span></article>
      <article class="metric-card danger"><div class="metric-top"><span>Stok habis</span><span class="metric-symbol">!</span></div><strong class="metric-value">${formatNumber(out)}</strong><span class="metric-note">Barang tanpa persediaan</span></article>
    </div>
    <div class="overview-grid">
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Barang perlu diperhatikan</h2><p class="panel-description">Stok rendah dan barang yang sudah habis</p></div><button class="text-link" data-view="inventory">Lihat semua →</button></div>
        <div class="table-wrap"><table><thead><tr><th>Nama barang</th><th>Kategori</th><th>Stok</th><th>Status</th></tr></thead><tbody>${products.filter((product) => product.stock <= product.min_stock).length ? products.filter((product) => product.stock <= product.min_stock).slice(0, 4).map((product) => { const [status, klass] = statusFor(product); return `<tr><td><div class="product-cell"><span class="product-thumb">${categoryIcon(product.category)}</span><span><span class="product-name">${escapeHtml(product.name)}</span><span class="product-sku">${escapeHtml(product.sku)}</span></span></div></td><td>${escapeHtml(product.category)}</td><td class="stock-cell">${formatNumber(product.stock)} <span class="stock-unit">${escapeHtml(product.unit || "pcs")}</span></td><td><span class="status-pill ${klass}">${status}</span></td></tr>`; }).join("") : `<tr><td class="empty-state" colspan="4">Semua barang berada di atas batas minimum stok.</td></tr>`}</tbody></table></div>
      </section>
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Aktivitas terbaru</h2><p class="panel-description">Catatan mutasi stok terakhir</p></div><button class="text-link" data-view="movements">Semua →</button></div><div class="activity-list">${activityItems(latest)}</div></section>
    </div>
    <div class="lower-grid"><section class="panel"><div class="panel-header"><div><h2 class="panel-title">Barang per kategori</h2><p class="panel-description">Jumlah jenis barang dalam katalog</p></div></div><div class="category-list">${categories.map((category) => `<div class="category-row"><span>${escapeHtml(category.name)}</span><span class="category-track"><span class="category-fill" style="display:block;width:${Math.round(category.count / max * 100)}%"></span></span><span class="category-count">${category.count}</span></div>`).join("") || `<div class="empty-state">Belum ada data kategori.</div>`}</div></section>
      <section class="panel attention-panel"><span class="attention-mark">↗</span><div><h3>${low + out ? `${low + out} barang perlu ditinjau` : "Stok dalam kondisi baik"}</h3><p>${low + out ? "Periksa daftar stok menipis agar perlengkapan penting tetap tersedia." : "Belum ada barang di bawah batas minimum."}</p><button class="text-link" data-view="inventory">Buka persediaan →</button></div></section></div>`;
}

function activityItems(movements) {
  if (!movements.length) return `<div class="empty-state">Belum ada mutasi stok.</div>`;
  return movements.map((movement) => { const incoming = movement.movement_type === "in"; return `<div class="activity-item"><span class="activity-mark ${incoming ? "" : "out"}">${incoming ? "↓" : "↑"}</span><span style="min-width:0;flex:1"><span class="activity-name">${escapeHtml(movement.product_name || "Barang")}</span><span class="activity-meta">${incoming ? "Barang masuk" : "Barang keluar"} · ${formatDate(movement.created_at)}</span></span><span class="activity-quantity ${incoming ? "" : "out"}">${incoming ? "+" : "−"}${formatNumber(movement.quantity)}</span></div>`; }).join("");
}

function inventoryView() {
  const matching = state.products.filter((product) => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(state.search.toLowerCase()) && (state.category === "Semua kategori" || product.category === state.category));
  return `${pageHeading("Katalog barang", "Persediaan", `${formatNumber(state.products.length)} jenis perlengkapan dalam katalog.`, `<button class="button button-primary" data-action="product"><span class="button-icon">＋</span>Tambah barang</button>`)}
    <div class="toolbar"><label class="search-wrap"><span class="search-icon">⌕</span><input class="field" id="inventory-search" type="search" placeholder="Cari nama barang atau SKU..." value="${escapeHtml(state.search)}" /></label><select class="select-field filter-select" id="category-filter" aria-label="Filter kategori">${categoryNames().map((category) => `<option ${state.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select></div>
    <section class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Nama barang</th><th>Kategori</th><th>Pemasok</th><th>Stok</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${productRows(matching)}</tbody></table></div></section>`;
}

function movementsView() {
  const rows = [...state.movements].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return `${pageHeading("Riwayat persediaan", "Mutasi stok", "Catatan barang masuk dan barang keluar.", `<button class="button button-primary" data-action="movement"><span class="button-icon">＋</span>Catat mutasi</button>`)}
    <section class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Nama barang</th><th>Jenis mutasi</th><th>Jumlah</th><th>Catatan</th></tr></thead><tbody>${rows.length ? rows.map((movement) => `<tr><td>${formatDate(movement.created_at)}</td><td><span class="product-name">${escapeHtml(movement.product_name || "Barang")}</span></td><td><span class="status-pill ${movement.movement_type === "in" ? "" : "low"}">${movement.movement_type === "in" ? "Barang masuk" : "Barang keluar"}</span></td><td class="stock-cell">${formatNumber(movement.quantity)} <span class="stock-unit">unit</span></td><td>${escapeHtml(movement.note || "-")}</td></tr>`).join("") : `<tr><td class="empty-state" colspan="5">Belum ada catatan mutasi.</td></tr>`}</tbody></table></div></section>`;
}

function reportsView() {
  const products = state.products;
  const totalUnits = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const totalValue = products.reduce((sum, product) => sum + Number(product.stock || 0) * Number(product.price || 0), 0);
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];
  return `${pageHeading("Analisis persediaan", "Laporan", "Gambaran singkat kondisi katalog dan nilai stok.")}
    <div class="report-grid"><section class="panel report-card"><h2 class="panel-title">Ringkasan stok</h2><div class="report-stat"><span>Total jenis barang</span><strong>${formatNumber(products.length)}</strong></div><div class="report-stat"><span>Total unit tersedia</span><strong>${formatNumber(totalUnits)}</strong></div><div class="report-stat"><span>Stok menipis atau habis</span><strong>${formatNumber(products.filter((product) => product.stock <= product.min_stock).length)}</strong></div></section>
    <section class="panel report-card"><h2 class="panel-title">Komposisi katalog</h2>${categories.map((category) => `<div class="report-stat"><span>${escapeHtml(category)}</span><strong>${formatNumber(products.filter((product) => product.category === category).length)} barang</strong></div>`).join("") || `<p class="page-subtitle">Belum ada data kategori.</p>`}</section>
    <section class="panel report-card"><h2 class="panel-title">Estimasi nilai stok</h2><div class="report-stat"><span>Nilai berdasarkan harga barang</span><strong>${formatCurrency(totalValue)}</strong></div><p class="panel-description">Nilai dihitung dari jumlah stok dikalikan harga satuan masing-masing barang.</p></section>
    <section class="panel report-card"><h2 class="panel-title">Aktivitas mutasi</h2><div class="report-stat"><span>Total transaksi tercatat</span><strong>${formatNumber(state.movements.length)}</strong></div><div class="report-stat"><span>Barang masuk</span><strong>${formatNumber(state.movements.filter((movement) => movement.movement_type === "in").length)}</strong></div><div class="report-stat"><span>Barang keluar</span><strong>${formatNumber(state.movements.filter((movement) => movement.movement_type === "out").length)}</strong></div></section></div>`;
}

function render() {
  const views = { dashboard: dashboardView, inventory: inventoryView, movements: movementsView, reports: reportsView };
  const labels = { dashboard: "Ringkasan", inventory: "Persediaan", movements: "Mutasi stok", reports: "Laporan" };
  content.innerHTML = views[state.view]();
  document.querySelector("#breadcrumb-current").textContent = labels[state.view];
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === state.view));
  bindViewControls();
}

function bindViewControls() {
  content.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  content.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => openModal(button.dataset.action)));
  content.querySelectorAll("[data-move-product]").forEach((button) => button.addEventListener("click", () => openModal("movement", button.dataset.moveProduct)));
  const search = document.querySelector("#inventory-search");
  if (search) search.addEventListener("input", (event) => { state.search = event.target.value; const cursor = event.target.selectionStart; render(); const nextSearch = document.querySelector("#inventory-search"); nextSearch.focus(); nextSearch.setSelectionRange(cursor, cursor); });
  const filter = document.querySelector("#category-filter");
  if (filter) filter.addEventListener("change", (event) => { state.category = event.target.value; render(); });
}

function setView(view) {
  state.view = view;
  render();
  closeSidebar();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function openModal(type, selectedProduct = "") {
  const isProduct = type === "product";
  const productOptions = state.products.map((product) => `<option value="${escapeHtml(product.id)}" ${selectedProduct === product.id ? "selected" : ""}>${escapeHtml(product.name)} · ${escapeHtml(product.sku)}</option>`).join("");
  const categoryOptions = [...new Set(state.products.map((product) => product.category).filter(Boolean))].map((category) => `<option>${escapeHtml(category)}</option>`).join("");
  const supplierOptions = [...new Set(state.products.map((product) => product.supplier).filter(Boolean))].map((supplier) => `<option>${escapeHtml(supplier)}</option>`).join("");
  document.querySelector("#modal-root").innerHTML = `<div class="modal-backdrop" data-dismiss="true"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><div><h2 id="modal-title">${isProduct ? "Tambah barang" : "Catat mutasi stok"}</h2><p>${isProduct ? "Tambahkan perlengkapan ke dalam katalog." : "Catat jumlah barang masuk atau keluar."}</p></div><button class="modal-close" type="button" data-close aria-label="Tutup">×</button></header>
    <form class="modal-form" id="modal-form">${isProduct ? `<div class="form-field"><label for="product-name">Nama barang</label><input class="field" id="product-name" name="name" required placeholder="Contoh: Bola basket indoor" /></div><div class="form-grid"><div class="form-field"><label for="product-sku">SKU</label><input class="field" id="product-sku" name="sku" required placeholder="BKT-001" /></div><div class="form-field"><label for="product-unit">Satuan</label><input class="field" id="product-unit" name="unit" value="pcs" required /></div></div><div class="form-grid"><div class="form-field"><label for="product-category">Kategori</label><input class="field" id="product-category" name="category" list="category-list" required placeholder="Contoh: Bola" /><datalist id="category-list">${categoryOptions}</datalist></div><div class="form-field"><label for="product-supplier">Pemasok</label><input class="field" id="product-supplier" name="supplier" list="supplier-list" placeholder="Nama pemasok" /><datalist id="supplier-list">${supplierOptions}</datalist></div></div><div class="form-grid"><div class="form-field"><label for="product-stock">Stok awal</label><input class="field" id="product-stock" name="stock" type="number" min="0" value="0" required /></div><div class="form-field"><label for="product-min">Batas minimum</label><input class="field" id="product-min" name="min_stock" type="number" min="0" value="5" required /></div></div><div class="form-field"><label for="product-price">Harga satuan (Rp)</label><input class="field" id="product-price" name="price" type="number" min="0" value="0" /></div>` : `<div class="form-field"><label for="movement-product">Nama barang</label><select class="select-field" id="movement-product" name="product_id" required>${productOptions || "<option value=''>Tambahkan barang terlebih dahulu</option>"}</select></div><div class="form-grid"><div class="form-field"><label for="movement-type">Jenis mutasi</label><select class="select-field" id="movement-type" name="movement_type"><option value="in">Barang masuk</option><option value="out">Barang keluar</option></select></div><div class="form-field"><label for="movement-quantity">Jumlah</label><input class="field" id="movement-quantity" name="quantity" type="number" min="1" value="1" required /></div></div><div class="form-field"><label for="movement-note">Catatan</label><input class="field" id="movement-note" name="note" placeholder="Contoh: Pembelian baru" /></div>`}
    <div class="modal-actions"><button class="button button-secondary" type="button" data-close>Batal</button><button class="button button-primary" type="submit">${isProduct ? "Simpan barang" : "Simpan mutasi"}</button></div></form></section></div>`;
  const modalRoot = document.querySelector("#modal-root");
  modalRoot.querySelectorAll("[data-close], [data-dismiss]").forEach((element) => element.addEventListener("click", (event) => { if (element.hasAttribute("data-close") || event.target === element) modalRoot.innerHTML = ""; }));
  modalRoot.querySelector("#modal-form").addEventListener("submit", (event) => submitModal(event, isProduct));
  modalRoot.querySelector(isProduct ? "#product-name" : "#movement-product")?.focus();
}

async function submitModal(event, isProduct) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  if (isProduct) {
    const product = { id: `demo-${Date.now()}`, ...values, stock: Number(values.stock), min_stock: Number(values.min_stock), price: Number(values.price || 0) };
    if (state.connected) {
      try {
        const categoryRows = await api("/categories?on_conflict=name", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ name: values.category }) });
        const category = Array.isArray(categoryRows) ? categoryRows[0] : categoryRows;
        let supplierId;
        if (values.supplier) {
          const supplierRows = await api("/suppliers?on_conflict=name", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ name: values.supplier }) });
          supplierId = (Array.isArray(supplierRows) ? supplierRows[0] : supplierRows).id;
        }
        const savedRows = await api("/products", { method: "POST", body: JSON.stringify({ name: values.name, sku: values.sku, unit: values.unit, category_id: category.id, supplier_id: supplierId || null, stock: 0, min_stock: product.min_stock, price: product.price }) });
        const saved = Array.isArray(savedRows) ? savedRows[0] : savedRows;
        if (!saved?.id) throw new Error("Supabase tidak mengembalikan ID barang baru.");
        product.id = saved.id;
        product.stock = 0;
        product.category = values.category;
        product.supplier = values.supplier || "-";
        if (Number(values.stock) > 0) {
          await api("/stock_movements", { method: "POST", body: JSON.stringify({ product_id: saved.id, movement_type: "in", quantity: Number(values.stock), note: "Stok awal" }) });
          product.stock = Number(values.stock);
        }
      } catch (error) { showToast(error.message, true); return; }
    }
    state.products.unshift(product);
  } else {
    const product = state.products.find((item) => item.id === values.product_id);
    if (!product) { showToast("Pilih barang terlebih dahulu.", true); return; }
    const quantity = Number(values.quantity);
    if (values.movement_type === "out" && quantity > product.stock) { showToast("Jumlah keluar melebihi stok yang tersedia.", true); return; }
    const movement = { id: `mv-${Date.now()}`, ...values, quantity, product_name: product.name, created_at: new Date().toISOString() };
    if (state.connected) {
      try { await api("/stock_movements", { method: "POST", body: JSON.stringify({ product_id: values.product_id, movement_type: values.movement_type, quantity, note: values.note }) }); }
      catch (error) { showToast(error.message, true); return; }
    }
    product.stock += values.movement_type === "in" ? quantity : -quantity;
    state.movements.unshift(movement);
  }
  document.querySelector("#modal-root").innerHTML = "";
  showToast(isProduct ? "Barang berhasil ditambahkan." : "Mutasi stok berhasil dicatat.");
  render();
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.textContent = message;
  document.querySelector("#toast-root").append(toast);
  setTimeout(() => toast.remove(), 3400);
}

const sidebar = document.querySelector("#sidebar");
const mobileBackdrop = document.createElement("div");
mobileBackdrop.className = "mobile-backdrop";
document.body.append(mobileBackdrop);
function closeSidebar() { sidebar.classList.remove("is-open"); mobileBackdrop.classList.remove("is-visible"); }
document.querySelector("#mobile-menu").addEventListener("click", () => { sidebar.classList.add("is-open"); mobileBackdrop.classList.add("is-visible"); });
mobileBackdrop.addEventListener("click", closeSidebar);
document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => setView(item.dataset.view)));
document.querySelector("#sign-out").addEventListener("click", async () => {
  try {
    await fetch(`${supabaseConfig.url.replace(/\/$/, "")}/auth/v1/logout`, { method: "POST", headers: { apikey: supabaseConfig.publishableKey, Authorization: `Bearer ${session?.access_token || ""}` } });
  } finally {
    localStorage.removeItem(sessionStorageKey);
    session = null;
    state.connected = false;
    showAuth("Anda sudah keluar.");
  }
});
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
initialize();