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
  var LOCAL_PRODUCTS = "gulnish-products-v14";
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

  var ITEM_NAME = { gr1: "Purse", gr2: "Gajray", gr3: "Keychain", gr4: "Bag", gr5: "Jewellery Set", gr6: "Headband" };
  var BASE_PRICE = { gr1: 850, gr2: 400, gr3: 350, gr4: 1400, gr5: 550, gr6: 450 };

  var REAL_PRODUCTS = {
    "seed_gr4_1": { name: "Earbuds Bag", price: 1599 },
    "seed_gr1_1": { name: "Premium hand made Rose Purse 1 (price per single purse)", price: 5799 },
    "seed_gr1_2": { name: "Premium hand made Rose Purse 2 (price per single purse)", price: 5799 },
    "seed_gr1_3": { name: "Premium hand made Rose Purse 3 (price per single purse)", price: 5799 },
    "seed_gr1_10": { name: "Premium hand made Rose Purse 4 (price per single purse)", price: 5799 },
    "seed_gr1_11": { name: "Premium hand made Rose Purse 5 (price per single purse)", price: 5799 },
    "seed_gr1_12": { name: "Premium hand made Rose Purse 6 (price per single purse)", price: 5799 },
    "seed_gr1_15": { name: "Premium hand made Rose Purse 7 (price per single purse)", price: 5799 },
    "seed_gr1_16": { name: "Premium hand made Rose Purse 8 (price per single purse)", price: 5799 },
    "seed_gr1_19": { name: "Premium hand made Rose Purse 9 (price per single purse)", price: 5799 },
    "seed_gr1_20": { name: "Premium hand made Rose Purse 10 (price per single purse)", price: 5799 },
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
          name: real ? real.name : "Handmade Crochet " + name + " " + (i + 1),
          price: real ? real.price : (BASE_PRICE[key] || 500) + (i % 4) * 50,
          category: key,
          image: img,
          keywords: (CATEGORY_KEYWORDS[key] || [label.toLowerCase()]).slice(),
          colors: []
        });
      });
    });
    return out;
  }

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
      version: 3
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
        return Promise.all([
          sb.from("products").select("*").order("created_at", { ascending: true }),
          sb.from("settings").select("data").eq("id", SETTINGS_ID).maybeSingle(),
          sb.from("orders").select("*").order("created_at", { ascending: false })
        ]).then(function (results) {
          var prodRes = results[0];
          var setRes = results[1];
          var ordRes = results[2];
          if (prodRes.error) throw prodRes.error;
          if (setRes.error) throw setRes.error;
          if (ordRes.error) throw ordRes.error;

          products.length = 0;
          (prodRes.data || []).forEach(function (p) { products.push(p); });

          settings = setRes.data && setRes.data.data
            ? normalizeSettings(setRes.data.data)
            : defaultSettings();

          orders.length = 0;
          (ordRes.data || []).forEach(function (o) {
            orders.push(orderFromRow(o));
          });

          _setupRealtimeSubscriptions();
        }).catch(function (e) {
          console.warn("Could not load shared data:", e);
        });
      }

      products.length = 0;
      var fallbackProducts = lsGet(LOCAL_PRODUCTS, defaultProducts());
      (fallbackProducts || []).forEach(function (p) { products.push(p); });
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

    /* ---- order search (admin) ---- */
    searchOrders: function (query, statusFilter) {
      var q = String(query || "").toLowerCase().trim();
      var sf = String(statusFilter || "").trim();
      return orders.filter(function (o) {
        if (sf && (o.status || "Pending") !== sf) return false;
        if (!q) return true;
        var cust = o.customer || {};
        var haystack = [
          o.id || "",
          cust.name || "",
          cust.phone || "",
          cust.email || "",
          cust.city || "",
          cust.address || "",
          cust.notes || ""
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
        todayOrders: todayOrders
      };
    },

    /* ---- bulk operations ---- */
    bulkUpdateStatus: async function (ids, status) {
      if (!ids.length) return { ok: true };

      ids.forEach(function (id) {
        var o = orders.find(function (x) { return x.id === id; });
        if (o) o.status = status;
      });

      if (!configured) {
        lsSet(LOCAL_ORDERS, orders);
        return { ok: true };
      }

      var results = await Promise.all(
        ids.map(function (id) {
          return sb.from("orders").update({ status: status }).eq("id", id);
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
        colors: product.colors || []
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
      orders.unshift(order);

      if (!configured) {
        lsSet(LOCAL_ORDERS, orders);
        return { ok: true };
      }
      var row = orderToRow(order);
      var res = await sb.from("orders").upsert(row, { onConflict: "id" });
      return { ok: !res.error, error: res.error };
    },

    updateOrderStatus: async function (id, status) {
      var o = orders.find(function (x) { return x.id === id; });
      if (o) o.status = status;

      if (!configured) {
        lsSet(LOCAL_ORDERS, orders);
        return { ok: true };
      }
      var res = await sb.from("orders").update({ status: status }).eq("id", id);
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
    }
  };

  /* ---------- row mappers ---------- */
  function orderToRow(o) {
    var c = o.customer || {};
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
      payment: o.payment || "",
      status: o.status || "Pending",
      placed_at: o.placedAt || new Date().toISOString()
    };
  }

  function orderFromRow(r) {
    return {
      id: r.id,
      placedAt: r.placed_at || r.created_at,
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
      payment: r.payment || "",
      status: r.status || "Pending"
    };
  }

  window.GC = GC;

  var bootPromise = boot();
})();
