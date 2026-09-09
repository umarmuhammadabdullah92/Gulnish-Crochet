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
  var LOCAL_PRODUCTS = "gulnish-products-v11";
  var LOCAL_SETTINGS = "gulnish-settings";
  var LOCAL_ORDERS = "gulnish-orders";
  var LOCAL_ADMIN_SESSION = "gulnish-admin-session";
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

  /* ---------- default settings (mirrors original) ---------- */
  var DEFAULT_COUNT = 6;
  var DEFAULT_NAMES = ["Purses", "Gajrays", "Keychains"];
  var EXTRA_CATEGORY_NAMES = { 4: "Bags", 5: "Jewellery", 6: "Headband" };

  var CATEGORY_IMAGE_SETS = {
    gr1: ["images/purses/purse-1.webp", "images/purses/purse-2.webp", "images/purses/purse-23.png", "images/purses/purse-24.png"],
    gr2: ["images/gajrays/gajray-1.webp", "images/gajrays/gajray-2.webp", "images/gajrays/gajray-3.webp", "images/gajrays/gajray-4.webp", "images/gajrays/gajray-5.webp"],
    gr3: ["images/keychains/keychain-1.webp", "images/keychains/keychain-2.webp"],
    gr4: ["images/bags/bag-1.webp", "images/bags/bag-2.webp"],
    gr5: ["images/jewellery/jewellery-1.webp", "images/jewellery/jewellery-2.webp", "images/jewellery/jewellery-3.webp", "images/jewellery/jewellery-4.webp", "images/jewellery/jewellery-5.webp", "images/jewellery/jewellery-6.webp", "images/jewellery/jewellery-7.webp", "images/jewellery/jewellery-8.webp", "images/jewellery/jewellery-9.webp"],
    gr6: ["images/headbands/headband-1.webp", "images/headbands/headband-2.webp"]
  };

  /* ---------- placeholder product catalog ----------
     Starter products generated from the photos in the repo so the
     shop is populated before you enter real data. Names, prices and
     keywords are placeholders — edit them in the Product Manager. */
  var RAW_IMAGES = {
    gr1: ["images/purses/purse-1.webp", "images/purses/purse-2.webp", "images/purses/purse-3.webp", "images/purses/purse-4.webp", "images/purses/purse-5.webp", "images/purses/purse-6.webp", "images/purses/purse-7.webp", "images/purses/purse-8.webp", "images/purses/purse-9.webp", "images/purses/purse-10.webp", "images/purses/purse-11.webp", "images/purses/purse-12.webp", "images/purses/purse-13.webp", "images/purses/purse-14.webp", "images/purses/purse-15.webp", "images/purses/purse-16.webp", "images/purses/purse-17.webp", "images/purses/purse-18.webp", "images/purses/purse-19.webp", "images/purses/purse-20.webp", "images/purses/purse-21.webp", "images/purses/purse-22.webp", "images/purses/purse-23.png", "images/purses/purse-24.png", "images/purses/purse-25.png", "images/purses/purse-26.png", "images/purses/purse-27.png", "images/purses/purse-28.png", "images/purses/purse-29.png", "images/purses/purse-30.png", "images/purses/purse-31.png", "images/purses/purse-32.png", "images/purses/purse-33.png"],
    gr2: ["images/gajrays/gajray-1.webp", "images/gajrays/gajray-2.webp", "images/gajrays/gajray-3.webp", "images/gajrays/gajray-4.webp", "images/gajrays/gajray-5.webp", "images/gajrays/gajray-6.jpg", "images/gajrays/gajray-7.jpg", "images/gajrays/gajray-8.png", "images/gajrays/gajray-9.png"],
    gr3: ["images/keychains/keychain-1.webp", "images/keychains/keychain-2.webp", "images/keychains/keychain-3.png", "images/keychains/keychain-4.png", "images/keychains/keychain-5.png", "images/keychains/keychain-6.png", "images/keychains/keychain-7.png", "images/keychains/keychain-8.png", "images/keychains/keychain-9.png", "images/keychains/keychain-10.png", "images/keychains/keychain-11.png", "images/keychains/keychain-12.png", "images/keychains/keychain-13.png", "images/keychains/keychain-14.png", "images/keychains/keychain-15.png", "images/keychains/keychain-16.png", "images/keychains/keychain-17.png", "images/keychains/keychain-18.png", "images/keychains/keychain-19.png", "images/keychains/keychain-20.png"],
    gr4: ["images/bags/bag-1.webp", "images/bags/bag-2.webp"],
    gr5: ["images/jewellery/jewellery-1.webp", "images/jewellery/jewellery-2.webp", "images/jewellery/jewellery-3.webp", "images/jewellery/jewellery-4.webp", "images/jewellery/jewellery-5.webp", "images/jewellery/jewellery-6.webp", "images/jewellery/jewellery-7.webp", "images/jewellery/jewellery-8.webp", "images/jewellery/jewellery-9.webp"],
    gr6: ["images/headbands/headband-1.webp", "images/headbands/headband-2.webp", "images/headbands/headband-3.webp"]
  };

  var ITEM_NAME = { gr1: "Purse", gr2: "Gajray", gr3: "Keychain", gr4: "Bag", gr5: "Jewellery Set", gr6: "Headband" };
  var BASE_PRICE = { gr1: 850, gr2: 400, gr3: 350, gr4: 1400, gr5: 550, gr6: 450 };

  /* ---------- real product overrides ----------
     Exact names/price for specific products set by the owner.
     Keyed by the seed id they get in defaultProducts(). */
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
      version: 2
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

  /* ---------- tiny password hashing (SHA-256) ---------- */
  function sha256(text) {
    return window.crypto && window.crypto.subtle
      ? crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(
          function (buf) {
            return Array.from(new Uint8Array(buf))
              .map(function (b) { return b.toString(16).padStart(2, "0"); })
              .join("");
          }
        )
      : Promise.resolve(text);
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
      // localStorage demo mode: we don't keep a real password; treat as unlocked
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

    /* ---- orders lookup by phone ---- */
    getOrdersByPhone: function (phone) {
      var norm = String(phone || "").replace(/[^\d]/g, "").replace(/^0+/, "");
      if (!norm) return [];
      return orders.filter(function (o) {
        return String(o.customer && o.customer.phone || "").replace(/[^\d]/g, "").replace(/^0+/, "") === norm;
      });
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
      // Supabase-configured mode: upload bytes to Storage, return public URL.
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
      // Fallback: return the data URL as-is.
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
