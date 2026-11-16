(async function () {
  const app = window.StoreApp;
  const itemsContainer = document.getElementById("cartItems");
  const noticeId = "cartNotice";

  function updateTotals(cart) {
    document.getElementById("cartSubtotal").textContent = app.money(
      cart.subtotal,
    );
    document.getElementById("cartTotal").textContent = app.money(cart.subtotal);
  }

  function renderCart(cart) {
    updateTotals(cart);
    if (!cart.items.length) {
      itemsContainer.innerHTML = `<div class="empty-cart"><h2>Your cart is empty</h2><p>There is plenty to discover. Find something you love.</p><a class="button button-accent" href="/products.html">Browse products</a></div>`;
      document
        .getElementById("checkoutLink")
        .setAttribute("aria-disabled", "true");
      document.getElementById("checkoutLink").classList.add("is-disabled");
      return;
    }
    document.getElementById("checkoutLink").removeAttribute("aria-disabled");
    document.getElementById("checkoutLink").classList.remove("is-disabled");
    itemsContainer.innerHTML = cart.items
      .map(
        (item) => `
            <article class="cart-item" data-item-id="${app.escapeHTML(item.cart_item_id)}">
                <a class="cart-item-image" href="/product-details.html?id=${encodeURIComponent(item.product_id)}"><img src="${app.getImageUrl(item.image)}" alt="${app.escapeHTML(item.product_name)}" onerror="this.src='/images/placeholder.svg'"></a>
                <div><p class="eyebrow">${app.escapeHTML(item.category_name)}</p><h3><a href="/product-details.html?id=${encodeURIComponent(item.product_id)}">${app.escapeHTML(item.product_name)}</a></h3><p>Size: ${app.escapeHTML(item.size)}</p><p>Price: ${app.money(item.price)}</p><div class="cart-item-tools"><label>Qty <input class="quantity-edit" type="number" min="1" max="${item.stock}" value="${item.quantity}" aria-label="Quantity for ${app.escapeHTML(item.product_name)}"></label><strong>${app.money(item.line_total)}</strong><button type="button" class="link-button remove-item">Remove</button></div></div>
            </article>`,
      )
      .join("");

    itemsContainer.querySelectorAll(".quantity-edit").forEach((input) =>
      input.addEventListener("change", async () => {
        const card = input.closest(".cart-item");
        const itemId = card.dataset.itemId;
        const quantity = Number(input.value);
        if (!Number.isInteger(quantity) || quantity < 1) {
          app.showNotice(noticeId, "Quantity must be at least 1.", "error");
          await loadCart();
          return;
        }
        input.disabled = true;
        try {
          const result = await app.apiRequest(
            `/cart/${encodeURIComponent(itemId)}`,
            { method: "PUT", body: { quantity } },
          );
          app.showNotice(noticeId, result.message, "success");
          renderCart(result.cart);
          await app.updateCartCount();
        } catch (error) {
          app.showNotice(noticeId, error.message, "error");
          await loadCart();
        }
      }),
    );

    itemsContainer.querySelectorAll(".remove-item").forEach((button) =>
      button.addEventListener("click", async () => {
        const card = button.closest(".cart-item");
        button.disabled = true;
        try {
          const result = await app.apiRequest(
            `/cart/${encodeURIComponent(card.dataset.itemId)}`,
            { method: "DELETE" },
          );
          app.showNotice(noticeId, result.message, "success");
          renderCart(result.cart);
          await app.updateCartCount();
        } catch (error) {
          app.showNotice(noticeId, error.message, "error");
          button.disabled = false;
        }
      }),
    );
  }

  async function loadCart() {
    try {
      const result = await app.apiRequest("/cart");
      renderCart(result.cart);
    } catch (error) {
      app.showNotice(noticeId, error.message, "error");
      itemsContainer.innerHTML =
        '<div class="empty-state"><h2>Could not load your cart</h2><p>Please refresh and try again.</p></div>';
    }
  }

  document.getElementById("checkoutLink").addEventListener("click", (event) => {
    if (event.currentTarget.getAttribute("aria-disabled") === "true")
      event.preventDefault();
  });

  await loadCart();
})();
