/* =========================================================
   Gulnish Crochet — shared data layer (Supabase)
   =========================================================
   One place all pages use to read and write products, settings
   and orders to a shared Supabase Postgres database, so every
   visitor sees the same up-to-date shop.

   If no Supabase keys are configured (GC_CONFIG empty), the
   site falls back to per-browser localStorage so it keeps
   working before you set up Supabase.

   Exposes a single global:  window.GC
   ========================================================= */

(function () {
  "use strict";

  /* Bump LOCAL_PRODUCTS version whenever the seed catalog changes so
     returning visitors' browsers re-sync products (offline/localStorage mode). */
  var LOCAL_PRODUCTS = "gulnish-products-v23";
  var LOCAL_SETTINGS = "gulnish-settings-v2";
  var LOCAL_ORDERS = "gulnish-orders";
  var LOCAL_ADMIN_SESSION = "gulnish-admin-session";
  var LOCAL_CUSTOMER = "gulnish-customer";
  var SETTINGS_ID = "app";

  var cfg = window.GC_CONFIG || {};
  var configured = Boolean(
    cfg.supabaseUrl &&
    cfg.supabaseAnonKey &&
    typeof window.supabase !== "undefined"
  );

  var sb = null;
  if (configured) {
    try {
      sb = window.supabase.createClient(
        cfg.supabaseUrl,
        cfg.supabaseAnonKey
      );
    } catch (e) {
      console.error("Supabase init failed, using localStorage:", e);
      sb = null;
      configured = false;
    }
  }

  /* ---------- in-memory stores ---------- */
  var products = [];
  var settings = null;
  var orders = [];
  var _orderSubscriptions = [];
  var _onOrdersChanged = null;

  /* ---------- default settings (mirrors original) ---------- */
  var DEFAULT_COUNT = 6;
  var DEFAULT_NAMES = ["Purses", "Gajrays", "Keychains"];
  var EXTRA_CATEGORY_NAMES = { 4: "Bags", 5: "Jewellery", 6: "Headband" };

  var CATEGORY_IMAGE_SETS = {
    gr1: ["images/purses/purse-1.webp", "images/purses/purse-2.webp", "images/purses/purse-23.webp", "images/purses/purse-24.webp"],
    gr2: ["images/gajrays/gajray-1.webp", "images/gajrays/gajray-9.webp", "images/gajrays/gajray-4.webp", "images/gajrays/gajray-5.webp", "images/gajrays/gajray-6.webp", "images/gajrays/gajray-8.webp", "images/gajrays/gajray-10.webp", "images/gajrays/gajray-11.webp", "images/gajrays/gajray-12.webp", "images/gajrays/gajray-13.webp", "images/gajrays/gajray-14.webp", "images/gajrays/gajray-15.webp", "images/gajrays/gajray-16.webp", "images/gajrays/gajray-17.webp"],
    gr3: ["images/keychains/keychain-1.webp", "images/keychains/keychain-2.webp"],
    gr4: ["images/bags/bag-1.webp", "images/bags/bag-2.webp"],
    gr5: ["images/jewellery/jewellery-1.webp", "images/jewellery/jewellery-2.webp", "images/jewellery/jewellery-3.webp", "images/jewellery/jewellery-4.webp", "images/jewellery/jewellery-5.webp", "images/jewellery/jewellery-6.webp", "images/jewellery/jewellery-7.webp", "images/jewellery/jewellery-8.webp", "images/jewellery/jewellery-9.webp"],
    gr6: ["images/headbands/headband-1.webp", "images/headbands/headband-2.webp"]
  };

  /* ---------- placeholder product catalog ---------- */
  var RAW_IMAGES = {
    gr1: ["images/purses/purse-1.webp", "images/purses/purse-2.webp", "images/purses/purse-3.webp", "images/purses/purse-4.webp", "images/purses/purse-5.webp", "images/purses/purse-6.webp", "images/purses/purse-7.webp", "images/purses/purse-8.webp", "images/purses/purse-9.webp", "images/purses/purse-10.webp", "images/purses/purse-11.webp", "images/purses/purse-12.webp", "images/purses/purse-13.webp", "images/purses/purse-14.webp", "images/purses/purse-15.webp", "images/purses/purse-16.webp", "images/purses/purse-17.webp", "images/purses/purse-18.webp", "images/purses/purse-19.webp", "images/purses/purse-20.webp", "images/purses/purse-21.webp", "images/purses/purse-22.webp", "images/purses/purse-23.webp", "images/purses/purse-24.webp", "images/purses/purse-25.webp", "images/purses/purse-26.webp", "images/purses/purse-27.webp", "images/purses/purse-28.webp", "images/purses/purse-29.webp", "images/purses/purse-30.webp", "images/purses/purse-31.webp", "images/purses/purse-32.webp", "images/purses/purse-33.webp"],
    gr2: ["images/gajrays/gajray-1.webp", "images/gajrays/gajray-9.webp", "images/gajrays/gajray-4.webp", "images/gajrays/gajray-5.webp", "images/gajrays/gajray-6.webp", "images/gajrays/gajray-8.webp", "images/gajrays/gajray-10.webp", "images/gajrays/gajray-11.webp", "images/gajrays/gajray-12.webp", "images/gajrays/gajray-13.webp", "images/gajrays/gajray-14.webp", "images/gajrays/gajray-15.webp", "images/gajrays/gajray-16.webp", "images/gajrays/gajray-17.webp"],
    gr3: ["images/keychains/keychain-1.webp", "images/keychains/keychain-2.webp", "images/keychains/keychain-3.webp", "images/keychains/keychain-4.webp", "images/keychains/keychain-5.webp", "images/keychains/keychain-6.webp", "images/keychains/keychain-7.webp", "images/keychains/keychain-8.webp", "images/keychains/keychain-9.webp", "images/keychains/keychain-10.webp", "images/keychains/keychain-11.webp", "images/keychains/keychain-12.webp", "images/keychains/keychain-13.webp", "images/keychains/keychain-14.webp", "images/keychains/keychain-15.webp", "images/keychains/keychain-16.webp", "images/keychains/keychain-17.webp", "images/keychains/keychain-18.webp", "images/keychains/keychain-19.webp", "images/keychains/keychain-20.webp"],
    gr4: ["images/bags/bag-1.webp", "images/bags/bag-2.webp"],
    gr5: ["images/jewellery/jewellery-1.webp", "images/jewellery/jewellery-2.webp", "images/jewellery/jewellery-3.webp", "images/jewellery/jewellery-4.webp", "images/jewellery/jewellery-5.webp", "images/jewellery/jewellery-6.webp", "images/jewellery/jewellery-7.webp", "images/jewellery/jewellery-8.webp", "images/jewellery/jewellery-9.webp"],
    gr6: ["images/headbands/headband-1.webp", "images/headbands/headband-2.webp", "images/headbands/headband-3.webp"]
  };

  var ITEM_NAME = { gr1: "Purse", gr2: "Gajray", gr3: "Keychain", gr4: "Bag", gr5: "Jewellery", gr6: "Headband" };
  var BASE_PRICE = { gr1: 850, gr2: 400, gr3: 350, gr4: 1400, gr5: 550, gr6: 450 };

  var REAL_PRODUCTS = {
    "seed_gr4_1": { name: "Bag 1", price: 1599 },
    "seed_gr1_1": { name: "Purse 1", price: 5799 },
    "seed_gr1_2": { name: "Purse 2", price: 5799 },
    "seed_gr1_3": { name: "Purse 3", price: 5799 },
    "seed_gr1_10": { name: "Purse 10", price: 5799 },
    "seed_gr1_11": { name: "Purse 11", price: 5799 },
    "seed_gr1_12": { name: "Purse 12", price: 5799 },
    "seed_gr1_15": { name: "Purse 15", price: 5799 },
    "seed_gr1_16": { name: "Purse 16", price: 5799 },
    "seed_gr1_19": { name: "Purse 19", price: 5799 },
    "seed_gr1_20": { name: "Purse 20", price: 5799 },
  };
  var PRODUCT_PRICES = {
    "seed_gr1_4": 4500,
    "seed_gr1_5": 4500,
    "seed_gr1_6": 5500,
    "seed_gr1_7": 4500,
    "seed_gr1_8": 5500,
    "seed_gr1_9": 5500,
    "seed_gr1_13": 4500,
    "seed_gr1_14": 4500,
    "seed_gr1_16": 5799,
    "seed_gr1_17": 5799,
    "seed_gr1_18": 5500,
    "seed_gr1_21": 2500,
    "seed_gr1_22": 5500,
    "seed_gr1_23": 5500,
    "seed_gr1_24": 2500,
    "seed_gr1_25": 2500,
    "seed_gr1_26": 5500,
    "seed_gr1_27": 4500,
    "seed_gr1_28": 2500,
    "seed_gr1_29": 5500,
    "seed_gr1_30": 4500,
    "seed_gr1_31": 5500,
    "seed_gr1_32": 4500,
    "seed_gr1_33": 5500,
    "seed_gr2_1": 1199,
    "seed_gr2_2": 3999,
    "seed_gr2_3": 2499,
    "seed_gr2_4": 2499,
    "seed_gr2_5": 3999,
    "seed_gr2_6": 2499,
    "seed_gr2_7": 2499,
    "seed_gr2_8": 2499,
    "seed_gr2_9": 2499,
    "seed_gr2_10": 3999,
    "seed_gr2_11": 2499,
    "seed_gr2_12": 2499,
    "seed_gr2_13": 2499,
    "seed_gr2_14": 2499,
    "seed_gr3_1": 450,
    "seed_gr3_2": 450,
    "seed_gr3_3": 450,
    "seed_gr3_4": 450,
    "seed_gr3_5": 450,
    "seed_gr3_6": 450,
    "seed_gr3_7": 450,
    "seed_gr3_8": 450,
    "seed_gr3_9": 450,
    "seed_gr3_10": 450,
    "seed_gr3_11": 450,
    "seed_gr3_12": 450,
    "seed_gr3_13": 450,
    "seed_gr3_14": 450,
    "seed_gr3_15": 450,
    "seed_gr3_16": 450,
    "seed_gr3_17": 450,
    "seed_gr3_18": 450,
    "seed_gr3_19": 450,
    "seed_gr3_20": 450,
    "seed_gr4_1": 5999,
    "seed_gr4_2": 5999,
    "seed_gr5_1": 1499,
    "seed_gr5_2": 1499,
    "seed_gr5_3": 1499,
    "seed_gr5_4": 1499,
    "seed_gr5_5": 1599,
    "seed_gr5_6": 1499,
    "seed_gr5_7": 1599,
    "seed_gr5_8": 1499,
    "seed_gr5_9": 1499,
    "seed_gr6_1": 1299,
    "seed_gr6_2": 1299,
    "seed_gr6_3": 1299
  };
  var CATEGORY_KEYWORDS = {
    gr1: ["handbag", "purse", "crochet bag", "handmade", "gift", "woolen"],
    gr2: ["wedding", "eid", "hair", "flowers", "party", "gift"],
    gr3: ["keyring", "small gift", "cute", "handmade", "gift", "wholesale"],
    gr4: ["handbag", "tote", "shopper bag", "handmade", "gift"],
    gr5: ["necklace", "earrings", "bridal", "wedding", "gift", "accessory"],
    gr6: ["hairband", "hair accessory", "girl", "handmade", "gift"]
  };

  function defaultProducts() {
    var cats = defaultSettings().categories;
    var out = [];
    Object.keys(RAW_IMAGES).forEach(function (key) {
      var catIdx = parseInt(key.replace("gr", ""), 10) - 1;
      var label = cats[catIdx] || ITEM_NAME[key] || "Item";
      var name = ITEM_NAME[key] || label;
      RAW_IMAGES[key].forEach(function (img, i) {
        var id = "seed_" + key + "_" + (i + 1);
        var real = REAL_PRODUCTS[id];
        out.push({
          id: id,
          name: real ? real.name : name + " " + (i + 1),
          price: PRODUCT_PRICES[id] || (real ? real.price : (BASE_PRICE[key] || 500) + (i % 4) * 50),
          category: key,
          image: img,
          keywords: (CATEGORY_KEYWORDS[key] || [label.toLowerCase()]).slice(),
          colors: [],
          status: "in stock",
          stock: LOW_STOCK_DEMO[id] != null ? LOW_STOCK_DEMO[id] : null,
          gallery: []
        });
      });
    });
    return out;
  }

  /* Placeholder low-stock examples so the urgency badge is visible until the
     shop owner sets real counts in the admin (Stock count). Edit or clear them
     in admin.html — the field is per-product. */
  var LOW_STOCK_DEMO = {
    "seed_gr1_1": 1,
    "seed_gr1_2": 2,
    "seed_gr2_1": 1,
    "seed_gr3_1": 2
  };

  function normalizeProduct(p) {
    var s = String((p && p.status) || "").trim().toLowerCase();
    var status = "in stock";
    if (s === "sold out" || s === "sold-out") status = "sold out";
    else if (s === "made to order" || s === "made-to-order") status = "made to order";
    var st = p && p.stock != null && p.stock !== "" ? Math.max(0, parseInt(p.stock, 10) || 0) : null;
    var gal = Array.isArray(p && p.gallery)
      ? p.gallery.filter(function (x) { return typeof x === "string" && x.trim(); })
      : [];
    return Object.assign({}, p, { status: status, stock: st, gallery: gal });
  }

  /* ---------- v<19>.sql also mirrors this catalog ---------- */

  function defaultSettings() {
    var cats = [];
    for (var i = 0; i < DEFAULT_COUNT; i += 1) {
      cats.push(DEFAULT_NAMES[i] || EXTRA_CATEGORY_NAMES[i + 1] || "Category " + (i + 1));
    }
    return {
      categories: cats,
      categoryImages: CATEGORY_IMAGE_SETS,
      whatsapp: "03075729901",
      craftDays: 5,
      deliveryDays: 3,
      bankAccountTitle: "",
      bankAccountNo: "",
      bankIBAN: "",
      jazzcashNumber: "",
      easypaisaNumber: "",
      shippingFee: "",
      freeDeliveryMin: 2500,
      version: 4
    };
  }

  function normalizeSettings(raw) {
    var base = raw && typeof raw === "object" ? raw : {};
    var s = defaultSettings();

    var cats = Array.isArray(base.categories) ? base.categories : null;
    if (cats && cats.length >= DEFAULT_COUNT) {
      s.categories = cats.slice(0, DEFAULT_COUNT);
    }
    if (base.categoryImages && typeof base.categoryImages === "object") {
      var ci = {};
      (base.categories && base.categories.length >= DEFAULT_COUNT
        ? base.categories
        : s.categories
      ).forEach(function (_, i) {
        var k = "gr" + (i + 1);
        ci[k] = Array.isArray(base.categoryImages[k])
          ? base.categoryImages[k].slice(0, 5)
          : CATEGORY_IMAGE_SETS[k] || [];
      });
      s.categoryImages = ci;
    }
    if (base.whatsapp) s.whatsapp = base.whatsapp;
    if (base.adminPasswordHash) s.adminPasswordHash = base.adminPasswordHash;
    if (base.craftDays) s.craftDays = parseInt(base.craftDays, 10) || 5;
    if (base.deliveryDays) s.deliveryDays = parseInt(base.deliveryDays, 10) || 3;
    if (base.bankAccountTitle) s.bankAccountTitle = base.bankAccountTitle;
    if (base.bankAccountNo) s.bankAccountNo = base.bankAccountNo;
    if (base.bankIBAN) s.bankIBAN = base.bankIBAN;
    if (base.jazzcashNumber) s.jazzcashNumber = base.jazzcashNumber;
    if (base.easypaisaNumber) s.easypaisaNumber = base.easypaisaNumber;
    if (base.shippingFee != null && base.shippingFee !== "") s.shippingFee = parseFloat(base.shippingFee);
    if (base.freeDeliveryMin != null && base.freeDeliveryMin !== "") s.freeDeliveryMin = parseFloat(base.freeDeliveryMin);
    return s;
  }

  /* ---------- localStorage helpers (fallback) ---------- */
  function lsGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function lsSet(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* ignore */ }
  }

  /* =============================================================
     PUBLIC API
     ============================================================= */

  function boot() {
    try {
      if (configured) {
        var sessionPromise = sb.auth.getSession().then(function (s) {
          return !!(s.data && s.data.session);
        }).catch(function () {
          return false;
        });

        return Promise.all([
          sb.from("products").select("*").order("created_at", { ascending: true }),
          sb.from("settings").select("data").eq("id", SETTINGS_ID).maybeSingle(),
          sessionPromise
        ]).then(function (results) {
          var prodRes = results[0];
          var setRes = results[1];
          var isAdminUser = results[2];
          if (prodRes.error) throw prodRes.error;
          if (setRes.error) throw setRes.error;

          products.length = 0;
          (prodRes.data || []).forEach(function (p) { products.push(normalizeProduct(p)); });

          settings = setRes.data && setRes.data.data
            ? normalizeSettings(setRes.data.data)
            : defaultSettings();

          GC.isAdmin = isAdminUser;

          // Only signed-in admins load order data. Anonymous visitors never
          // receive the order list (RLS + this gate), so no customer data
          // leaves the database through the pages.
          if (!isAdminUser) {
            orders.length = 0;
            return Promise.resolve();
          }
          return sb.from("orders").select("*").order("created_at", { ascending: false })
            .then(function (ordRes) {
              if (ordRes.error) throw ordRes.error;
              orders.length = 0;
              (ordRes.data || []).forEach(function (o) {
                orders.push(orderFromRow(o));
              });
              _setupRealtimeSubscriptions();
            })
            .catch(function (e) {
              console.warn("Could not load orders:", e);
              orders.length = 0;
            });
        }).catch(function (e) {
          console.warn("Could not load shared data:", e);
        });
      }

      products.length = 0;
      var fallbackProducts = lsGet(LOCAL_PRODUCTS, defaultProducts());
      (fallbackProducts || []).forEach(function (p) { products.push(normalizeProduct(p)); });
      if (!localStorage.getItem(LOCAL_PRODUCTS)) lsSet(LOCAL_PRODUCTS, products);
      settings = normalizeSettings(lsGet(LOCAL_SETTINGS, null));
      orders.length = 0;
      (lsGet(LOCAL_ORDERS, []) || []).forEach(function (o) { orders.push(o); });
      try {
        GC.isAdmin = localStorage.getItem(LOCAL_ADMIN_SESSION) === "1";
      } catch (e) { GC.isAdmin = false; }
      return Promise.resolve();
    } catch (e) {
      console.warn("Could not load shared data:", e);
      return Promise.resolve();
    }
  }

  /* ---------- Realtime subscriptions ---------- */
  function _setupRealtimeSubscriptions() {
    if (!configured || !sb) return;

    try {
      var channel = sb
        .channel("orders-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, function (payload) {
          _handleOrderChange(payload);
        })
        .subscribe();
      _orderSubscriptions.push(channel);
    } catch (e) {
      console.warn("Realtime subscription failed:", e);
    }
  }

  function _handleOrderChange(payload) {
    var eventType = payload.eventType;
    var row = payload.new || payload.old;

    if (eventType === "INSERT" && row) {
      var existing = orders.find(function (o) { return o.id === row.id; });
      if (!existing) {
        orders.unshift(orderFromRow(row));
      }
    } else if (eventType === "UPDATE" && row) {
      var idx = orders.findIndex(function (o) { return o.id === row.id; });
      var updated = orderFromRow(row);
      if (idx !== -1) {
        orders[idx] = updated;
      } else {
        orders.unshift(updated);
      }
    } else if (eventType === "DELETE" && row) {
      orders = orders.filter(function (o) { return o.id !== row.id; });
    }

    if (_onOrdersChanged) {
      try { _onOrdersChanged(orders); } catch (e) { /* ignore */ }
    }
  }

  /* ============================================================= */

  var GC = {
    configured: configured,
    isAdmin: false,
    get products() { return products; },
    get settings() { return settings; },
    get orders() { return orders; },

    /* ---- boot ---- */
    init: function () {
      return bootPromise;
    },

    /* ---- auth ---------- */
    signInAdmin: async function (email, password) {
      if (configured) {
        var res = await sb.auth.signInWithPassword({ email: email, password: password });
        if (res.error) return false;
        GC.isAdmin = true;
        return true;
      }
      GC.isAdmin = true;
      try { localStorage.setItem(LOCAL_ADMIN_SESSION, "1"); } catch (e) { /* ignore */ }
      return true;
    },

    signOutAdmin: async function () {
      if (configured) await sb.auth.signOut();
      GC.isAdmin = false;
      try { localStorage.removeItem(LOCAL_ADMIN_SESSION); } catch (e) { /* ignore */ }
      return true;
    },

    checkAdminSession: async function () {
      if (!configured) {
        try {
          GC.isAdmin = localStorage.getItem(LOCAL_ADMIN_SESSION) === "1";
        } catch (e) { GC.isAdmin = false; }
        return GC.isAdmin;
      }
      var res = await sb.auth.getSession();
      GC.isAdmin = !!(res.data && res.data.session);
      return GC.isAdmin;
    },

    /* ---- realtime callback ---- */
    onOrdersChanged: function (callback) {
      _onOrdersChanged = callback;
    },

    // Re-read localStorage (unconfigured mode) so shared browser tabs pick
    // up new orders. No-op when Supabase is configured (realtime handles it).
    refreshLocalData: function () {
      if (configured) return Promise.resolve();
      try {
        products.length = 0;
        (lsGet(LOCAL_PRODUCTS, defaultProducts()) || []).forEach(function (p) { products.push(normalizeProduct(p)); });
        orders.length = 0;
        (lsGet(LOCAL_ORDERS, []) || []).forEach(function (o) { orders.push(o); });
      } catch (e) { /* ignore */ }
      if (_onOrdersChanged) {
        try { _onOrdersChanged(orders); } catch (e) { /* ignore */ }
      }
      return Promise.resolve();
    },

    /* ---- customer profile (auto-fill) ---- */
    saveCustomerProfile: function (profile) {
      try { lsSet(LOCAL_CUSTOMER, profile); } catch (e) { /* ignore */ }
    },

    getCustomerProfile: function () {
      return lsGet(LOCAL_CUSTOMER, null);
    },

    /* ---- orders lookup by phone ---- */
    getOrdersByPhone: function (phone) {
      var norm = String(phone || "").replace(/[^\d]/g, "").replace(/^0+/, "");
      if (!norm) return [];
      return orders.filter(function (o) {
        return String(o.customer && o.customer.phone || "").replace(/[^\d]/g, "").replace(/^0+/, "") === norm;
      });
    },

    /* ---- customer order lookup (tracking page) ----
       Server-side when Supabase is configured: returns only the orders
       matching the given order id or phone number via an RPC function,
       so visitors can never pull the full order list. */
    lookupOrders: async function (query) {
      var value = String(query || "").trim();
      if (!value) return [];
      if (!configured) {
        var upper = value.toUpperCase();
        var phoneNorm = value.replace(/[^\d]/g, "").replace(/^0+/, "");
        var byId = orders.find(function (o) {
          return String(o.id || "").toUpperCase() === upper;
        });
        if (byId) return [byId];
        return orders.filter(function (o) {
          return String(o.customer && o.customer.phone || "").replace(/[^\d]/g, "").replace(/^0+/, "") === phoneNorm;
        });
      }
      try {
        var res = await sb.rpc("get_customer_orders", { search: value, max_results: 50 });
        if (res.error) return [];
        return (res.data || []).map(orderFromRow);
      } catch (e) {
        return [];
      }
    },

    /* ---- order search (admin) ---- */
    searchOrders: function (query, statusFilter) {
      var q = String(query || "").toLowerCase().trim();
      var sf = String(statusFilter || "").trim();
      return orders.filter(function (o) {
        if (sf && (o.status || "Pending") !== sf) return false;
        if (!q) return true;
        var cust = o.customer || {};
        var pay = o.payment || {};
        var haystack = [
          o.id || "",
          cust.name || "",
          cust.phone || "",
          cust.email || "",
          cust.city || "",
          cust.address || "",
          cust.notes || "",
          o.status || "",
          pay.method || "",
          pay.status || ""
        ].join(" ").toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    },

    /* ---- order stats (admin dashboard) ---- */
    getOrderStats: function () {
      var total = orders.length;
      var pending = 0;
      var confirmed = 0;
      var processing = 0;
      var shipped = 0;
      var delivered = 0;
      var cancelled = 0;
      var revenue = 0;
      var cancelled = 0;
      var paidCount = 0;
      var todayOrders = 0;
      var today = new Date().toDateString();

      orders.forEach(function (o) {
        var s = (o.status || "Pending").toLowerCase();
        if (s === "pending") pending++;
        else if (s === "confirmed") confirmed++;
        else if (s === "processing") processing++;
        else if (s === "shipped") shipped++;
        else if (s === "delivered") delivered++;
        else if (s === "cancelled") cancelled++;

        if ((o.payment && o.payment.status || "Pending").toLowerCase() === "paid") paidCount++;

        if (s !== "cancelled") revenue += parseFloat(o.total) || 0;

        try {
          if (new Date(o.placedAt).toDateString() === today) todayOrders++;
        } catch (e) { /* ignore */ }
      });

      return {
        total: total,
        pending: pending,
        confirmed: confirmed,
        processing: processing,
        shipped: shipped,
        delivered: delivered,
        cancelled: cancelled,
        revenue: revenue,
        todayOrders: todayOrders,
        paidCount: paidCount
      };
    },

    /* ---- bulk operations ---- */
    bulkUpdateStatus: async function (ids, status, note) {
      if (!ids.length) return { ok: true };

      var updated = [];
      ids.forEach(function (id) {
        var o = orders.find(function (x) { return x.id === id; });
        var before = (o && o.updatedAt) || (o && o.placedAt) || "";
        GC.applyStatus(o, status, note);
        if (o && (o.updatedAt || "") !== before) updated.push(o);
      });

      if (!configured) {
        lsSet(LOCAL_ORDERS, orders);
        return { ok: true };
      }

      var results = await Promise.all(
        updated.map(function (o) {
          return sb.from("orders").update({
            status: o.status,
            status_history: o.statusHistory,
            est_delivery: o.estDelivery,
            updated_at: o.updatedAt
          }).eq("id", o.id);
        })
      );

      var anyError = results.some(function (r) { return r.error; });
      return { ok: !anyError };
    },

    bulkDeleteOrders: async function (ids) {
      if (!ids.length) return { ok: true };

      orders = orders.filter(function (o) { return ids.indexOf(o.id) === -1; });

      if (!configured) {
        lsSet(LOCAL_ORDERS, orders);
        return { ok: true };
      }

      var results = await Promise.all(
        ids.map(function (id) {
          return sb.from("orders").delete().eq("id", id);
        })
      );

      var anyError = results.some(function (r) { return r.error; });
      return { ok: !anyError };
    },

    /* ---- products ---- */
    saveProduct: async function (product) {
      var idx = products.findIndex(function (p) { return p.id === product.id; });
      if (idx !== -1) products[idx] = product;
      else products.unshift(product);

      if (!configured) {
        lsSet(LOCAL_PRODUCTS, products);
        return { ok: true };
      }
      var row = {
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        image: product.image || "",
        keywords: product.keywords || [],
        colors: product.colors || [],
        status: product.status || "in stock",
        stock: product.stock != null ? product.stock : null,
        gallery: product.gallery || []
      };
      var res = await sb.from("products").upsert(row, { onConflict: "id" });
      return { ok: !res.error, error: res.error };
    },

    deleteProduct: async function (id) {
      products = products.filter(function (p) { return p.id !== id; });

      if (!configured) {
        lsSet(LOCAL_PRODUCTS, products);
        return { ok: true };
      }
      var res = await sb.from("products").delete().eq("id", id);
      return { ok: !res.error, error: res.error };
    },

    // Marks ordered in-stock products as "sold out" so nobody else can
    // order a piece that has just been booked. Made-to-order items are
    // intentionally left untouched (they are crafted on demand). When a
    // numeric stock count exists it is decremented instead; reaching zero
    // flips the product to "sold out".
    reserveProducts: async function (items) {
      var touched = [];
      (items || []).forEach(function (it) {
        var idx = products.findIndex(function (p) { return p.id === it.id; });
        if (idx === -1) return;
        var s = String(products[idx].status || "").trim().toLowerCase();
        if (s === "made to order" || s === "made-to-order" || s === "sold out" || s === "sold-out") return;
        var stockNum = products[idx].stock;
        var next = Object.assign({}, products[idx]);
        if (stockNum != null && stockNum !== "") {
          var remaining = stockNum - (it.qty || 1);
          next.stock = Math.max(0, remaining);
          if (remaining <= 0) next.status = "sold out";
        } else {
          next.status = "sold out";
        }
        products[idx] = next;
        touched.push(products[idx]);
      });
      if (!touched.length) return { ok: true };
      if (!configured) {
        lsSet(LOCAL_PRODUCTS, products);
        return { ok: true };
      }
      var anyError = false;
      for (var i = 0; i < touched.length; i += 1) {
        var t = touched[i];
        var row = {
          id: t.id,
          name: t.name,
          price: t.price,
          category: t.category,
          image: t.image || "",
          keywords: t.keywords || [],
          colors: t.colors || [],
          status: t.status,
          stock: t.stock != null ? t.stock : null,
          gallery: t.gallery || []
        };
        var res = await sb.from("products").upsert(row, { onConflict: "id" });
        if (res.error) anyError = true;
      }
      return { ok: !anyError };
    },

    /* ---- settings ---- */
    saveSettings: async function (next) {
      settings = normalizeSettings(next);
      if (!configured) {
        lsSet(LOCAL_SETTINGS, settings);
        return { ok: true };
      }
      var res = await sb.from("settings").upsert(
        { id: SETTINGS_ID, data: settings },
        { onConflict: "id" }
      );
      return { ok: !res.error, error: res.error };
    },

    /* ---- orders ---- */
    saveOrder: async function (order) {
      // Normalize a full order model so callers can pass partial data.
      order.statusHistory = Array.isArray(order.statusHistory)
        ? order.statusHistory
        : [{ status: order.status || "Pending", at: order.placedAt || new Date().toISOString() }];
      if (typeof order.payment === "string" || !order.payment) {
        order.payment = {
          method: typeof order.payment === "string" ? order.payment : "Cash on delivery",
          status: "Pending"
        };
      }
      if (!order.payment.method) order.payment.method = "Cash on delivery";
      if (!order.payment.status) order.payment.status = "Pending";
      order.estDelivery = order.estDelivery || GC.deliveryEstimate(order.placedAt);
      order.updatedAt = order.placedAt || new Date().toISOString();
      orders.unshift(order);

      if (!configured) {
        lsSet(LOCAL_ORDERS, orders);
        return { ok: true };
      }
      var row = orderToRow(order);
      var res = await sb.from("orders").upsert(row, { onConflict: "id" });
      return { ok: !res.error, error: res.error };
    },

    updateOrderStatus: async function (id, status, note) {
      var o = orders.find(function (x) { return x.id === id; });
      GC.applyStatus(o, status, note);

      if (!configured) {
        lsSet(LOCAL_ORDERS, orders);
        return { ok: true };
      }
      var patch = {
        status: status,
        status_history: o ? o.statusHistory : [],
        est_delivery: o ? o.estDelivery : null,
        updated_at: new Date().toISOString()
      };
      var res = await sb.from("orders").update(patch).eq("id", id);
      return { ok: !res.error, error: res.error };
    },

    markOrderPaid: async function (id) {
      var o = orders.find(function (x) { return x.id === id; });
      if (!o) return { ok: true };
      if (!o.payment) o.payment = { method: "Cash on delivery", status: "Pending" };
      o.payment.status = "Paid";
      o.updatedAt = new Date().toISOString();

      if (!configured) {
        lsSet(LOCAL_ORDERS, orders);
        return { ok: true };
      }
      var res = await sb.from("orders").update({
        payment_status: "Paid",
        updated_at: o.updatedAt
      }).eq("id", id);
      return { ok: !res.error, error: res.error };
    },

    deleteOrder: async function (id) {
      orders = orders.filter(function (o) { return o.id !== id; });
      if (!configured) {
        lsSet(LOCAL_ORDERS, orders);
        return { ok: true };
      }
      var res = await sb.from("orders").delete().eq("id", id);
      return { ok: !res.error, error: res.error };
    },

    /* ---- images ---- */
    uploadImage: async function (fileOrDataUrl) {
      if (configured) {
        try {
          var ext = "webp";
          var name = "img_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "." + ext;
          var res = await sb.storage
            .from(cfg.storageBucket || "shop-images")
            .upload(name, fileOrDataUrl, {
              contentType: fileOrDataUrl.type || "image/webp",
              upsert: true
            });
          if (res.error) throw res.error;
          var pub = sb.storage
            .from(cfg.storageBucket || "shop-images")
            .getPublicUrl(name);
          return { url: pub.data.publicUrl };
        } catch (e) {
          console.warn("Storage upload failed, saving as data URL:", e);
        }
      }
      return { url: fileOrDataUrl };
    },

    /* ---- shop whatsapp ---- */
    shopWhatsApp: function () {
      var num = GC.settings.whatsapp || "03075729901";
      return String(num).replace(/[^\d]/g, "").replace(/^0+/, "");
    },

    /* ---- order system constants & helpers ---- */
    ORDER_STATUSES: ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"],

    makeOrderId: function () {
      var d = new Date();
      var ymd = String(d.getFullYear()) +
        String(d.getMonth() + 1).padStart(2, "0") +
        String(d.getDate()).padStart(2, "0");
      var rand = Math.random().toString(36).toUpperCase().slice(2, 8);
      var code = (rand + "ABCD") .slice(0, 4);
      return "GC-" + ymd + "-" + code;
    },

    // Estimated delivery date as ISO string.
    // shipOnly=true counts only delivery days (used once an order is Shipped).
    deliveryEstimate: function (fromISO, shipOnly) {
      var s = GC.settings || {};
      var craft = shipOnly ? 0 : (parseInt(s.craftDays, 10) || 5);
      var delivery = parseInt(s.deliveryDays, 10) || 3;
      try {
        var d = fromISO ? new Date(fromISO) : new Date();
        d.setDate(d.getDate() + craft + delivery);
        return d.toISOString();
      } catch (e) {
        return new Date(Date.now() + (craft + delivery) * 86400000).toISOString();
      }
    },

    // Records a timestamped status change on an order (idempotent).
    applyStatus: function (order, status, note) {
      if (!order) return;
      var s = String(status || "").trim();
      if (!s) return;
      order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      var last = order.statusHistory[order.statusHistory.length - 1];
      if (last && last.status === s && !note) return;
      order.statusHistory.push({
        status: s,
        at: new Date().toISOString(),
        note: note || ""
      });
      if (s.toLowerCase() === "cancelled") {
        order.estDelivery = null;
      } else if (s.toLowerCase() === "shipped") {
        order.estDelivery = GC.deliveryEstimate(new Date().toISOString(), true);
      }
      order.status = s;
      order.updatedAt = new Date().toISOString();
    },

    /* ---- order lookup by order number ---- */
    getOrderById: function (id) {
      var norm = String(id || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
      if (!norm) return null;
      return orders.find(function (o) {
        return String(o.id || "").toUpperCase() === norm;
      }) || null;
    },
  };

  /* ---------- row mappers ---------- */
  function orderToRow(o) {
    var c = o.customer || {};
    var pay = o.payment || {};
    var method = typeof o.payment === "string" ? o.payment : (pay.method || "Cash on delivery");
    return {
      id: o.id,
      phone: String(c.phone || "").replace(/[^\d]/g, "").replace(/^0+/, ""),
      customer_name: c.name || "",
      email: c.email || "",
      address: c.address || "",
      city: c.city || "",
      notes: c.notes || "",
      items: o.items || [],
      total: o.total || 0,
      payment_method: method,
      payment_status: (typeof o.payment === "string" ? "Pending" : (pay.status || "Pending")),
      payment: method,
      status: o.status || "Pending",
      status_history: o.statusHistory || [],
      est_delivery: o.estDelivery || null,
      craft_days: o.craftDays || null,
      delivery_days: o.deliveryDays || null,
      placed_at: o.placedAt || new Date().toISOString(),
      updated_at: o.updatedAt || o.placedAt || new Date().toISOString()
    };
  }

  function orderFromRow(r) {
    var method = r.payment_method || r.payment || "Cash on delivery";
    var history = Array.isArray(r.status_history) && r.status_history.length
      ? r.status_history
      : [{ status: r.status || "Pending", at: r.placed_at || r.created_at || new Date().toISOString(), note: "" }];
    return {
      id: r.id,
      placedAt: r.placed_at || r.created_at,
      updatedAt: r.updated_at || r.placed_at || r.created_at,
      customer: {
        name: r.customer_name || "",
        phone: r.phone || "",
        email: r.email || "",
        address: r.address || "",
        city: r.city || "",
        notes: r.notes || ""
      },
      items: r.items || [],
      total: r.total || 0,
      payment: {
        method: method,
        status: r.payment_status || "Pending"
      },
      status: r.status || "Pending",
      statusHistory: history,
      estDelivery: r.est_delivery || null,
      craftDays: r.craft_days || null,
      deliveryDays: r.delivery_days || null
    };
  }

  window.GC = GC;

  var bootPromise = boot();
})();
