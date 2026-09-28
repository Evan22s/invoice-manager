// =============================================================================
// Abundant Air — Customer & Invoice Manager
// app.js — all application logic lives here.
//
// This file was built with AI assistance (Claude) as part of a Hootcamp
// assignment on using AI tools to build a small full-stack web app. The
// overall structure is:
//   1. Connect to Supabase (our backend: database + authentication)
//   2. Handle register / log in / log out
//   3. Handle CRUD (Create, Read, Update, Delete) for "customers"
//   4. Handle CRUD for "invoices" (each invoice belongs to one customer)
//
// Nothing here uses a build step or a framework on purpose — it's plain
// JavaScript so it can be deployed to Netlify as-is, with zero build config.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Supabase client setup
// SUPABASE_URL and SUPABASE_ANON_KEY come from config.js (loaded before this
// file in index.html). The `supabase` global comes from the CDN script tag.
// -----------------------------------------------------------------------------
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cached in-memory list of the logged-in user's customers. We keep this
// around so the invoice form's "Customer" dropdown can be filled in without
// a fresh network request every time.
let cachedCustomers = [];

// -----------------------------------------------------------------------------
// Small DOM helpers so the rest of the file reads cleanly.
// -----------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

function formatMoney(value) {
  const number = Number(value || 0);
  return number.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

// =============================================================================
// 2. Authentication (register / log in / log out)
// =============================================================================

// --- Tab switching on the auth screen (Log in <-> Register) ----------------
$("tab-login").addEventListener("click", () => {
  $("tab-login").classList.add("is-active");
  $("tab-register").classList.remove("is-active");
  show($("login-form"));
  hide($("register-form"));
  setAuthMessage("");
});

$("tab-register").addEventListener("click", () => {
  $("tab-register").classList.add("is-active");
  $("tab-login").classList.remove("is-active");
  show($("register-form"));
  hide($("login-form"));
  setAuthMessage("");
});

function setAuthMessage(text, kind) {
  const el = $("auth-message");
  el.textContent = text;
  el.className = "auth-message" + (kind ? ` is-${kind}` : "");
}

// --- Register --------------------------------------------------------------
$("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("register-email").value.trim();
  const password = $("register-password").value;

  const { error } = await client.auth.signUp({ email, password });

  if (error) {
    setAuthMessage(error.message, "error");
    return;
  }

  // Depending on the Supabase project's email-confirmation setting, the user
  // may need to confirm their email before they can log in.
  setAuthMessage(
    "Account created. If email confirmation is enabled for this project, check your inbox, then log in.",
    "success"
  );
  event.target.reset();
});

// --- Log in ------------------------------------------------------------------
$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    setAuthMessage(error.message, "error");
    return;
  }
  // No need to manually show the app here — onAuthStateChange (below) does it.
});

// --- Log out -------------------------------------------------------------
$("logout-btn").addEventListener("click", async () => {
  await client.auth.signOut();
});

// --- React to auth state changes --------------------------------------------
// This single listener fires on page load AND whenever the user logs in/out,
// so it's the one place we decide which screen to show.
client.auth.onAuthStateChange((_event, session) => {
  if (session && session.user) {
    hide($("auth-view"));
    show($("app-view"));
    $("current-user-email").textContent = session.user.email;
    loadCustomers();
    loadInvoices();
  } else {
    show($("auth-view"));
    hide($("app-view"));
  }
});

// =============================================================================
// 3. Sidebar navigation (Customers page <-> Invoices page)
// =============================================================================
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("is-active"));
    link.classList.add("is-active");

    const target = link.dataset.page;
    document.querySelectorAll(".page").forEach((page) => hide(page));
    show($(`page-${target}`));
  });
});

// =============================================================================
// 4. Customers: Create, Read, Update, Delete
// =============================================================================

async function loadCustomers() {
  const { data, error } = await client
    .from("customers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    alert("Could not load customers: " + error.message);
    return;
  }

  cachedCustomers = data;
  renderCustomers(data);
  fillCustomerDropdown(data);
}

function renderCustomers(customers) {
  const tbody = $("customers-tbody");
  tbody.innerHTML = "";

  $("customers-empty").hidden = customers.length > 0;

  for (const customer of customers) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(customer.name)}</td>
      <td>${escapeHtml(customer.phone || "-")}</td>
      <td>${escapeHtml(customer.email || "-")}</td>
      <td>${escapeHtml(customer.address || "-")}</td>
      <td>
        <button class="btn-link" data-action="edit">Edit</button>
        <button class="btn-danger-text" data-action="delete">Delete</button>
      </td>
    `;
    row.querySelector('[data-action="edit"]').addEventListener("click", () => openCustomerForm(customer));
    row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteCustomer(customer));
    tbody.appendChild(row);
  }
}

function fillCustomerDropdown(customers) {
  const select = $("invoice-customer");
  const previousValue = select.value;
  select.innerHTML = customers
    .map((customer) => `<option value="${customer.id}">${escapeHtml(customer.name)}</option>`)
    .join("");
  if (previousValue) select.value = previousValue;
}

// --- Show/hide the add/edit form ---
$("new-customer-btn").addEventListener("click", () => openCustomerForm(null));
$("cancel-customer-btn").addEventListener("click", () => hide($("customer-form")));

function openCustomerForm(customer) {
  $("customer-id").value = customer ? customer.id : "";
  $("customer-name").value = customer ? customer.name : "";
  $("customer-phone").value = customer ? customer.phone || "" : "";
  $("customer-email").value = customer ? customer.email || "" : "";
  $("customer-address").value = customer ? customer.address || "" : "";
  $("save-customer-btn").textContent = customer ? "Save changes" : "Save customer";
  show($("customer-form"));
  $("customer-name").focus();
}

// --- Save (insert or update) ---
$("customer-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = $("customer-id").value;
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData.session.user.id;

  const record = {
    user_id: userId,
    name: $("customer-name").value.trim(),
    phone: $("customer-phone").value.trim(),
    email: $("customer-email").value.trim(),
    address: $("customer-address").value.trim(),
  };

  const result = id
    ? await client.from("customers").update(record).eq("id", id)
    : await client.from("customers").insert(record);

  if (result.error) {
    alert("Could not save customer: " + result.error.message);
    return;
  }

  hide($("customer-form"));
  event.target.reset();
  loadCustomers();
});

// --- Delete ---
async function deleteCustomer(customer) {
  const confirmed = confirm(
    `Delete ${customer.name}? This will also delete any invoices for this customer.`
  );
  if (!confirmed) return;

  const { error } = await client.from("customers").delete().eq("id", customer.id);
  if (error) {
    alert("Could not delete customer: " + error.message);
    return;
  }
  loadCustomers();
  loadInvoices();
}

// =============================================================================
// 5. Invoices: Create, Read, Update, Delete
// =============================================================================

async function loadInvoices() {
  // We ask Supabase to also pull back the related customer's name in the same
  // query, using its foreign-key join syntax: customers(name)
  const { data, error } = await client
    .from("invoices")
    .select("*, customers(name)")
    .order("invoice_date", { ascending: false });

  if (error) {
    alert("Could not load invoices: " + error.message);
    return;
  }

  renderInvoices(data);
}

function renderInvoices(invoices) {
  const tbody = $("invoices-tbody");
  tbody.innerHTML = "";

  $("invoices-empty").hidden = invoices.length > 0;

  for (const invoice of invoices) {
    const customerName = invoice.customers ? invoice.customers.name : "(deleted customer)";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(customerName)}</td>
      <td>${escapeHtml(invoice.invoice_date || "")}</td>
      <td>${formatMoney(invoice.amount)}</td>
      <td><span class="status-badge status-${invoice.status}">${invoice.status}</span></td>
      <td>${escapeHtml(invoice.notes || "-")}</td>
      <td>
        <button class="btn-link" data-action="edit">Edit</button>
        <button class="btn-danger-text" data-action="delete">Delete</button>
      </td>
    `;
    row.querySelector('[data-action="edit"]').addEventListener("click", () => openInvoiceForm(invoice));
    row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteInvoice(invoice));
    tbody.appendChild(row);
  }
}

// --- Show/hide the add/edit form ---
$("new-invoice-btn").addEventListener("click", () => {
  if (cachedCustomers.length === 0) {
    alert("Add a customer first, then you can create an invoice for them.");
    return;
  }
  openInvoiceForm(null);
});
$("cancel-invoice-btn").addEventListener("click", () => hide($("invoice-form")));

function openInvoiceForm(invoice) {
  $("invoice-id").value = invoice ? invoice.id : "";
  $("invoice-customer").value = invoice ? invoice.customer_id : cachedCustomers[0]?.id || "";
  $("invoice-date").value = invoice ? invoice.invoice_date : new Date().toISOString().slice(0, 10);
  $("invoice-amount").value = invoice ? invoice.amount : "";
  $("invoice-status").value = invoice ? invoice.status : "Unpaid";
  $("invoice-notes").value = invoice ? invoice.notes || "" : "";
  $("save-invoice-btn").textContent = invoice ? "Save changes" : "Save invoice";
  show($("invoice-form"));
}

// --- Save (insert or update) ---
$("invoice-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = $("invoice-id").value;
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData.session.user.id;

  const record = {
    user_id: userId,
    customer_id: $("invoice-customer").value,
    invoice_date: $("invoice-date").value,
    amount: parseFloat($("invoice-amount").value) || 0,
    status: $("invoice-status").value,
    notes: $("invoice-notes").value.trim(),
  };

  const result = id
    ? await client.from("invoices").update(record).eq("id", id)
    : await client.from("invoices").insert(record);

  if (result.error) {
    alert("Could not save invoice: " + result.error.message);
    return;
  }

  hide($("invoice-form"));
  event.target.reset();
  loadInvoices();
});

// --- Delete ---
async function deleteInvoice(invoice) {
  const confirmed = confirm("Delete this invoice? This cannot be undone.");
  if (!confirmed) return;

  const { error } = await client.from("invoices").delete().eq("id", invoice.id);
  if (error) {
    alert("Could not delete invoice: " + error.message);
    return;
  }
  loadInvoices();
}

// =============================================================================
// 6. Small utility: escape text before inserting it into innerHTML, so a
// customer name/note containing "<" or "&" can't break the page layout.
// =============================================================================
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
