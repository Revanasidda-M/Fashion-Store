(async function () {
  const app = window.StoreApp;
  const form = document.getElementById("checkoutForm");
  const itemsContainer = document.getElementById("checkoutItems");
  const submit = document.getElementById("placeOrderButton");
  let cart = null;

  try {
    const [cartResult, profileResult] = await Promise.all([
      app.apiRequest("/cart"),
      app.apiRequest("/profile"),
    ]);
    cart = cartResult.cart;
    if (!cart.items.length) {
      document.getElementById("checkoutForm").hidden = true;
      itemsContainer.innerHTML =
        '<p>Your cart is empty. <a class="text-link" href="/products.html">Browse products</a></p>';
      app.showNotice(
        "checkoutNotice",
        "Add at least one item to your cart before checking out.",
        "info",
      );
    } else {
      itemsContainer.innerHTML = cart.items
        .map(
          (item) =>
            `<div class="checkout-item"><div><strong>${app.escapeHTML(item.product_name)}</strong><p>Size ${app.escapeHTML(item.size)} · Qty ${item.quantity}</p></div><strong>${app.money(item.line_total)}</strong></div>`,
        )
        .join("");
    }
    document.getElementById("checkoutSubtotal").textContent = app.money(
      cart.subtotal,
    );
    document.getElementById("checkoutTotal").textContent = app.money(
      cart.subtotal,
    );
    const user = profileResult.user;
    document.getElementById("recipientName").value = user.name || "";
    document.getElementById("recipientPhone").value = user.phone || "";
    document.getElementById("address").value = user.address || "";
    document.getElementById("city").value = user.city || "";
    document.getElementById("state").value = user.state || "";
    document.getElementById("pincode").value = user.pincode || "";
  } catch (error) {
    app.showNotice("checkoutNotice", error.message, "error");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!cart || !cart.items.length) {
      app.showNotice("checkoutNotice", "Your cart is empty.", "error");
      return;
    }
    submit.disabled = true;
    submit.textContent = "Placing order…";
    try {
      const result = await app.apiRequest("/orders", {
        method: "POST",
        body: {
          recipientName: document.getElementById("recipientName").value.trim(),
          recipientPhone: document
            .getElementById("recipientPhone")
            .value.trim(),
          address: document.getElementById("address").value.trim(),
          city: document.getElementById("city").value.trim(),
          state: document.getElementById("state").value.trim(),
          pincode: document.getElementById("pincode").value.trim(),
          paymentMethod: document.getElementById("paymentMethod").value,
        },
      });
      localStorage.setItem("fashionStoreLastOrderId", result.orderId);
      window.location.href = "/order-confirmation.html";
    } catch (error) {
      app.showNotice("checkoutNotice", error.message, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "Place order";
    }
  });
})();
