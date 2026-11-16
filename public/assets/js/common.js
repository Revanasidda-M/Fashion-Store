(function () {
  const API_BASE_URL = "/api";
  const protectedPages = new Set([
    "cart.html",
    "checkout.html",
    "orders.html",
    "order-details.html",
    "profile.html",
  ]);

  function getToken() {
    return localStorage.getItem("fashionStoreToken");
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }

  function money(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  }

  async function apiRequest(path, options = {}) {
    const { auth = true, ...fetchOptions } = options;
    const headers = { ...(fetchOptions.headers || {}) };
    if (fetchOptions.body && typeof fetchOptions.body !== "string") {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }
    if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      data = {
        success: false,
        message: "The server returned an invalid response.",
      };
    }
    if (!response.ok) {
      if (response.status === 401 && auth && getToken()) {
        localStorage.removeItem("fashionStoreToken");
        localStorage.removeItem("fashionStoreUser");
      }
      throw new Error(data.message || `Request failed (${response.status}).`);
    }
    return data;
  }

  function showNotice(elementId, message, type = "info") {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = message;
    element.className = `notice notice-${type}`;
    element.hidden = !message;
  }

  function currentUser() {
    try {
      return JSON.parse(localStorage.getItem("fashionStoreUser") || "null");
    } catch {
      return null;
    }
  }

  function logoutUser() {
    localStorage.removeItem("fashionStoreToken");
    localStorage.removeItem("fashionStoreUser");
    localStorage.removeItem("fashionStoreLastOrderId");
    window.location.href = "/index.html?loggedOut=1";
  }

  async function updateCartCount() {
    const badge = document.getElementById("cartCount");
    if (!badge) return;
    if (!getToken()) {
      badge.textContent = "0";
      return;
    }
    try {
      const result = await apiRequest("/cart");
      badge.textContent = String(result.cart?.totalItems ?? 0);
    } catch {
      badge.textContent = "0";
    }
  }

  function getImageUrl(image) {
    if (!image) return "/images/placeholder.svg";
    if (
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("/")
    ) {
      return image;
    }
    return `/images/${encodeURIComponent(image)}`;
  }

  function renderProductCard(product) {
    const image = getImageUrl(product.image);
    return `
            <article class="product-card">
                <a class="product-card-image" href="/product-details.html?id=${encodeURIComponent(product.product_id)}" aria-label="View ${escapeHTML(product.product_name)}">
                    <img src="${image}" alt="${escapeHTML(product.product_name)}" loading="lazy" onerror="this.src='/images/placeholder.svg'">
                    ${Number(product.stock) === 0 ? '<span class="stock-badge">Out of stock</span>' : ""}
                </a>
                <div class="product-card-body">
                    <p class="eyebrow">${escapeHTML(product.category_name)}</p>
                    <h3><a href="/product-details.html?id=${encodeURIComponent(product.product_id)}">${escapeHTML(product.product_name)}</a></h3>
                    <div class="product-card-bottom">
                        <span class="price">${money(product.price)}</span>
                        <a class="text-link" href="/product-details.html?id=${encodeURIComponent(product.product_id)}">View details <span aria-hidden="true">↗</span></a>
                    </div>
                </div>
            </article>`;
  }

  function setupHeader() {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;
    const signedIn = Boolean(getToken());
    const commonLinks = `
            <a href="/index.html">Home</a>
            <a href="/products.html">All Products</a>
            <a href="/products.html?category=Men">Men</a>
            <a href="/products.html?category=Women">Women</a>
            <a href="/products.html?category=Kids">Kids</a>
            <a href="/products.html?category=Footwear">Footwear</a>
            <a href="/products.html?category=Accessories">Accessories</a>
            <a class="nav-cart" href="/cart.html">Cart <span id="cartCount" class="cart-count">0</span></a>`;
    if (signedIn) {
      navbar.innerHTML = `${commonLinks}
                <a href="/orders.html">My orders</a>
                <a href="/profile.html">Profile</a>
                <button class="nav-logout" id="logoutButton" type="button">Logout</button>`;
      document
        .getElementById("logoutButton")
        ?.addEventListener("click", logoutUser);
      updateCartCount();
    } else {
      navbar.innerHTML = `${commonLinks}
                <a href="/login.html">Login</a>
                <a class="nav-register" href="/register.html">Create account</a>`;
    }
  }

  function guardProtectedPage() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    if (protectedPages.has(page) && !getToken()) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login.html?next=${encodeURIComponent(next)}`);
    }
  }

  window.StoreApp = {
    apiRequest,
    escapeHTML,
    money,
    showNotice,
    currentUser,
    getToken,
    logoutUser,
    updateCartCount,
    renderProductCard,
    getImageUrl,
  };

  guardProtectedPage();
  setupHeader();
})();
