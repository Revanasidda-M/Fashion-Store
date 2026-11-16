const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { promisify } = require("util");
const { URL } = require("url");
const { readStore, writeStore } = require("./src/store");

// Load optional .env settings without requiring any npm packages.
(function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
})();

const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET =
  process.env.JWT_SECRET || "local-demo-secret-change-this-before-deployment";
const PUBLIC_DIR = path.join(__dirname, "public");
const scryptAsync = promisify(crypto.scrypt);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
}

function sendJson(res, statusCode, payload) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function cleanString(value, maxLength = 200) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeUser(user) {
  const { passwordHash, ...publicFields } = user;
  return publicFields;
}

function getCategory(store, categoryId) {
  return store.categories.find(
    (category) => category.category_id === categoryId,
  );
}

function productView(store, product) {
  const category = getCategory(store, product.category_id);
  const totalStock = product.sizes.reduce(
    (sum, size) => sum + Number(size.stock || 0),
    0,
  );
  return {
    product_id: product.product_id,
    product_name: product.product_name,
    category_id: product.category_id,
    category_name: category ? category.category_name : "Other",
    description: product.description,
    price: Number(product.price),
    brand: product.brand,
    image: product.image,
    stock: totalStock,
    sizes: product.sizes.map((size) => ({ ...size })),
  };
}

function findUserById(store, userId) {
  return store.users.find((user) => user.user_id === userId);
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.includes(":")) return false;
  const [salt, hashHex] = storedHash.split(":");
  const actual = await scryptAsync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function createToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ userId, iat: now, exp: now + 7 * 24 * 60 * 60 }),
  );
  const content = `${header}.${payload}`;
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(content)
    .digest("base64url");
  return `${content}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const content = `${parts[0]}.${parts[1]}`;
  const expected = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(content)
    .digest("base64url");
  const receivedBuffer = Buffer.from(parts[2]);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  )
    return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    if (
      !payload.userId ||
      !payload.exp ||
      payload.exp < Math.floor(Date.now() / 1000)
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}

function authenticatedUser(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const payload = verifyToken(match[1]);
  if (!payload) return null;
  const store = readStore();
  return findUserById(store, payload.userId) || null;
}

function cartView(store, userId) {
  const items = (store.carts[userId] || [])
    .map((cartItem) => {
      const product = store.products.find(
        (item) => item.product_id === cartItem.product_id,
      );
      if (!product) return null;
      const size = product.sizes.find(
        (entry) => entry.size_id === cartItem.size_id,
      );
      if (!size) return null;
      return {
        cart_item_id: cartItem.cart_item_id,
        product_id: product.product_id,
        product_name: product.product_name,
        category_name:
          (getCategory(store, product.category_id) || {}).category_name ||
          "Other",
        image: product.image,
        price: Number(product.price),
        size_id: size.size_id,
        size: size.size,
        quantity: Number(cartItem.quantity),
        stock: Number(size.stock),
        line_total: Number(product.price) * Number(cartItem.quantity),
      };
    })
    .filter(Boolean);
  return {
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.line_total, 0),
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100 * 1024) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON request body."));
      }
    });
    req.on("error", reject);
  });
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;
  const method = req.method || "GET";

  if (method === "GET" && pathname === "/api/health") {
    return sendJson(res, 200, {
      success: true,
      message: "Fashion Store API is running.",
    });
  }

  if (method === "GET" && pathname === "/api/categories") {
    const store = readStore();
    return sendJson(res, 200, { success: true, categories: store.categories });
  }

  if (method === "GET" && pathname === "/api/products") {
    const store = readStore();
    const search = cleanString(url.searchParams.get("q"), 100).toLowerCase();
    const requestedCategory = cleanString(
      url.searchParams.get("category"),
      80,
    ).toLowerCase();
    const sort = cleanString(url.searchParams.get("sort"), 40).toLowerCase();
    let products = store.products.map((product) => productView(store, product));
    if (requestedCategory)
      products = products.filter(
        (product) => product.category_name.toLowerCase() === requestedCategory,
      );
    if (search)
      products = products.filter((product) =>
        `${product.product_name} ${product.description} ${product.brand} ${product.category_name}`
          .toLowerCase()
          .includes(search),
      );
    if (sort === "price-asc" || sort === "low-to-high" || sort === "price-low-high") {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc" || sort === "high-to-low" || sort === "price-high-low") {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === "name-asc" || sort === "a-z") {
      products.sort((a, b) => a.product_name.localeCompare(b.product_name));
    } else if (sort === "name-desc" || sort === "z-a") {
      products.sort((a, b) => b.product_name.localeCompare(a.product_name));
    } else if (sort === "brand-asc") {
      products.sort((a, b) => a.brand.localeCompare(b.brand));
    }
    return sendJson(res, 200, { success: true, products });
  }

  const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
  if (method === "GET" && productMatch) {
    const store = readStore();
    const productId = decodeURIComponent(productMatch[1]);
    const product = store.products.find(
      (item) => item.product_id === productId,
    );
    if (!product)
      return sendJson(res, 404, {
        success: false,
        message: "Product not found.",
      });
    return sendJson(res, 200, {
      success: true,
      product: productView(store, product),
    });
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, 400, { success: false, message: error.message });
    }
    const name = cleanString(body.name, 100);
    const email = cleanString(body.email, 160).toLowerCase();
    const phone = cleanString(body.phone, 30);
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || !email || !phone || !password)
      return sendJson(res, 400, {
        success: false,
        message: "Name, email, phone and password are required.",
      });
    if (!/^\S+@\S+\.\S+$/.test(email))
      return sendJson(res, 400, {
        success: false,
        message: "Enter a valid email address.",
      });
    if (password.length < 8)
      return sendJson(res, 400, {
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    const store = readStore();
    if (store.users.some((user) => user.email === email))
      return sendJson(res, 409, {
        success: false,
        message: "An account with this email already exists.",
      });
    const user = {
      user_id: `user-${crypto.randomUUID()}`,
      name,
      email,
      phone,
      address: cleanString(body.address, 200),
      city: cleanString(body.city, 100),
      state: cleanString(body.state, 100),
      pincode: cleanString(body.pincode, 20),
      passwordHash: await hashPassword(password),
      created_at: new Date().toISOString(),
    };
    store.users.push(user);
    store.carts[user.user_id] = [];
    writeStore(store);
    return sendJson(res, 201, {
      success: true,
      message: "Account created successfully. Please log in.",
    });
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, 400, { success: false, message: error.message });
    }
    const email = cleanString(body.email, 160).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const store = readStore();
    const user = store.users.find((item) => item.email === email);
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      return sendJson(res, 401, {
        success: false,
        message: "Email or password is incorrect.",
      });
    return sendJson(res, 200, {
      success: true,
      message: "Login successful.",
      token: createToken(user.user_id),
      user: safeUser(user),
    });
  }

  // These endpoints require a signed, unexpired token and use only its account id.
  const needsAuth =
    pathname === "/api/profile" ||
    pathname === "/api/cart" ||
    pathname.startsWith("/api/cart/") ||
    pathname === "/api/orders" ||
    pathname.startsWith("/api/orders/");
  if (!needsAuth)
    return sendJson(res, 404, {
      success: false,
      message: "API endpoint not found.",
    });
  const user = authenticatedUser(req);
  if (!user)
    return sendJson(res, 401, {
      success: false,
      message: "Please log in again to continue.",
    });
  const userId = user.user_id;

  if (pathname === "/api/profile" && method === "GET") {
    const store = readStore();
    return sendJson(res, 200, {
      success: true,
      user: safeUser(findUserById(store, userId)),
    });
  }

  if (pathname === "/api/profile" && method === "PUT") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, 400, { success: false, message: error.message });
    }
    const store = readStore();
    const account = findUserById(store, userId);
    const name = cleanString(body.name, 100);
    const phone = cleanString(body.phone, 30);
    if (!name || !phone)
      return sendJson(res, 400, {
        success: false,
        message: "Name and phone are required.",
      });
    account.name = name;
    account.phone = phone;
    account.address = cleanString(body.address, 200);
    account.city = cleanString(body.city, 100);
    account.state = cleanString(body.state, 100);
    account.pincode = cleanString(body.pincode, 20);
    writeStore(store);
    return sendJson(res, 200, {
      success: true,
      message: "Profile updated successfully.",
      user: safeUser(account),
    });
  }

  if (pathname === "/api/cart" && method === "GET") {
    const store = readStore();
    return sendJson(res, 200, { success: true, cart: cartView(store, userId) });
  }

  if (pathname === "/api/cart" && method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, 400, { success: false, message: error.message });
    }
    const productId = cleanString(body.productId || body.product_id, 100);
    const sizeName = cleanString(body.size, 30);
    const quantity = Number(body.quantity);
    if (!productId || !sizeName || !Number.isInteger(quantity) || quantity < 1)
      return sendJson(res, 400, {
        success: false,
        message: "Choose a size and a valid quantity.",
      });
    const store = readStore();
    const product = store.products.find(
      (item) => item.product_id === productId,
    );
    if (!product)
      return sendJson(res, 404, {
        success: false,
        message: "Product not found.",
      });
    const size = product.sizes.find((item) => item.size === sizeName);
    if (!size)
      return sendJson(res, 400, {
        success: false,
        message: "That size is not available for this product.",
      });
    const userCart = store.carts[userId] || [];
    const existing = userCart.find(
      (item) => item.product_id === productId && item.size_id === size.size_id,
    );
    const newQuantity = quantity + (existing ? Number(existing.quantity) : 0);
    if (newQuantity > size.stock)
      return sendJson(res, 400, {
        success: false,
        message: `Only ${size.stock} unit(s) are available for size ${size.size}.`,
      });
    if (existing) existing.quantity = newQuantity;
    else
      userCart.push({
        cart_item_id: crypto.randomUUID(),
        product_id: productId,
        size_id: size.size_id,
        quantity,
      });
    store.carts[userId] = userCart;
    writeStore(store);
    return sendJson(res, 201, {
      success: true,
      message: "Product added to cart.",
      cart: cartView(store, userId),
    });
  }

  const cartItemMatch = pathname.match(/^\/api\/cart\/([^/]+)$/);
  if (cartItemMatch && method === "PUT") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, 400, { success: false, message: error.message });
    }
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1)
      return sendJson(res, 400, {
        success: false,
        message: "Quantity must be a whole number greater than zero.",
      });
    const store = readStore();
    const userCart = store.carts[userId] || [];
    const itemId = decodeURIComponent(cartItemMatch[1]);
    const item = userCart.find((entry) => entry.cart_item_id === itemId);
    if (!item)
      return sendJson(res, 404, {
        success: false,
        message: "Cart item not found.",
      });
    const product = store.products.find(
      (entry) => entry.product_id === item.product_id,
    );
    const size =
      product && product.sizes.find((entry) => entry.size_id === item.size_id);
    if (!size)
      return sendJson(res, 404, {
        success: false,
        message: "Product size not found.",
      });
    if (quantity > size.stock)
      return sendJson(res, 400, {
        success: false,
        message: `Only ${size.stock} unit(s) are available.`,
      });
    item.quantity = quantity;
    writeStore(store);
    return sendJson(res, 200, {
      success: true,
      message: "Cart quantity updated.",
      cart: cartView(store, userId),
    });
  }

  if (cartItemMatch && method === "DELETE") {
    const store = readStore();
    const userCart = store.carts[userId] || [];
    const itemId = decodeURIComponent(cartItemMatch[1]);
    const index = userCart.findIndex((entry) => entry.cart_item_id === itemId);
    if (index === -1)
      return sendJson(res, 404, {
        success: false,
        message: "Cart item not found.",
      });
    userCart.splice(index, 1);
    store.carts[userId] = userCart;
    writeStore(store);
    return sendJson(res, 200, {
      success: true,
      message: "Item removed from cart.",
      cart: cartView(store, userId),
    });
  }

  if (pathname === "/api/orders" && method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, 400, { success: false, message: error.message });
    }
    const recipientName = cleanString(body.recipientName || body.name, 100);
    const recipientPhone = cleanString(body.recipientPhone || body.phone, 30);
    const address = cleanString(body.address, 200);
    const city = cleanString(body.city, 100);
    const stateName = cleanString(body.state, 100);
    const pincode = cleanString(body.pincode, 20);
    const paymentMethod = cleanString(body.paymentMethod, 30);
    if (
      !recipientName ||
      !recipientPhone ||
      !address ||
      !city ||
      !stateName ||
      !pincode ||
      !paymentMethod
    )
      return sendJson(res, 400, {
        success: false,
        message: "Complete all delivery and payment fields.",
      });
    if (!["COD", "UPI_DEMO"].includes(paymentMethod))
      return sendJson(res, 400, {
        success: false,
        message: "Choose a supported demo payment method.",
      });
    const store = readStore();
    const cart = cartView(store, userId);
    if (!cart.items.length)
      return sendJson(res, 400, {
        success: false,
        message: "Your cart is empty.",
      });
    for (const item of cart.items) {
      const product = store.products.find(
        (entry) => entry.product_id === item.product_id,
      );
      const size =
        product &&
        product.sizes.find((entry) => entry.size_id === item.size_id);
      if (!size || item.quantity > size.stock)
        return sendJson(res, 400, {
          success: false,
          message: `${item.product_name} no longer has enough stock for this quantity.`,
        });
    }
    const orderNumber = Number(store.nextOrderNumber) || 1;
    const orderId = `ORD-${String(orderNumber).padStart(4, "0")}`;
    const order = {
      order_id: orderId,
      user_id: userId,
      created_at: new Date().toISOString(),
      status: "Pending",
      payment_method:
        paymentMethod === "COD" ? "Cash on Delivery" : "UPI (demo only)",
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      address,
      city,
      state: stateName,
      pincode,
      items: cart.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        image: item.image,
        price: item.price,
        size: item.size,
        quantity: item.quantity,
        line_total: item.line_total,
      })),
      total_amount: cart.subtotal,
    };
    // Reduce stock after the order snapshot is prepared.
    for (const item of cart.items) {
      const product = store.products.find(
        (entry) => entry.product_id === item.product_id,
      );
      const size =
        product &&
        product.sizes.find((entry) => entry.size_id === item.size_id);
      if (size) size.stock -= item.quantity;
    }
    store.orders.unshift(order);
    store.nextOrderNumber = orderNumber + 1;
    store.carts[userId] = [];
    writeStore(store);
    return sendJson(res, 201, {
      success: true,
      message: "Order placed successfully.",
      orderId,
      order,
    });
  }

  if (pathname === "/api/orders" && method === "GET") {
    const store = readStore();
    const orders = store.orders
      .filter((order) => order.user_id === userId)
      .map((order) => ({
        order_id: order.order_id,
        created_at: order.created_at,
        status: order.status,
        payment_method: order.payment_method,
        total_amount: order.total_amount,
        item_count: order.items.reduce(
          (sum, item) => sum + Number(item.quantity),
          0,
        ),
      }));
    return sendJson(res, 200, { success: true, orders });
  }

  const orderMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (orderMatch && method === "GET") {
    const store = readStore();
    const orderId = decodeURIComponent(orderMatch[1]);
    const order = store.orders.find(
      (entry) => entry.order_id === orderId && entry.user_id === userId,
    );
    if (!order)
      return sendJson(res, 404, {
        success: false,
        message: "Order not found.",
      });
    return sendJson(res, 200, { success: true, order });
  }

  return sendJson(res, 404, {
    success: false,
    message: "API endpoint not found.",
  });
}

function serveStatic(req, res, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return sendText(res, 400, "Invalid URL path.");
  }
  if (decodedPath === "/") decodedPath = "/index.html";
  const filePath = path.resolve(PUBLIC_DIR, `.${decodedPath}`);
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep))
    return sendText(res, 403, "Forbidden.");
  let targetPath = filePath;
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory())
    targetPath = path.join(targetPath, "index.html");
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile())
    return sendText(res, 404, "Page or file not found.");
  setSecurityHeaders(res);
  res.writeHead(200, {
    "Content-Type":
      MIME_TYPES[path.extname(targetPath).toLowerCase()] ||
      "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(targetPath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url || "/", `http://${host}`);
    if (url.pathname.startsWith("/api/")) {
      if (!["GET", "POST", "PUT", "DELETE", "HEAD"].includes(req.method)) {
        return sendJson(res, 405, {
          success: false,
          message: "Method not allowed.",
        });
      }
      return await handleApi(req, res, url);
    }
    if (req.method !== "GET" && req.method !== "HEAD")
      return sendText(res, 405, "Method not allowed.");
    return serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    if (!res.headersSent)
      sendJson(res, 500, {
        success: false,
        message: "Unexpected server error. Check the terminal for details.",
      });
    else res.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Fashion Store is running at http://localhost:${PORT}`);
  console.log("Demo store data is saved in data/store.json");
  if (!process.env.JWT_SECRET)
    console.log(
      "Note: using the local demo JWT secret; set JWT_SECRET in .env before deployment.",
    );
});
