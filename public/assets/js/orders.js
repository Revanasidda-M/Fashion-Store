(async function () {
  const app = window.StoreApp;
  const container = document.getElementById("ordersContainer");
  try {
    const result = await app.apiRequest("/orders");
    if (!result.orders.length) {
      container.innerHTML =
        '<div class="empty-cart"><h2>No orders yet</h2><p>Your placed orders will appear here.</p><a class="button button-accent" href="/products.html">Start shopping</a></div>';
      return;
    }
    container.innerHTML = result.orders
      .map(
        (order) => `
            <article class="order-card">
              <div class="order-card-head"><div><h3>${app.escapeHTML(order.order_id)}</h3><p>Placed ${new Date(order.created_at).toLocaleString()}</p></div><span class="status-pill">${app.escapeHTML(order.status)}</span></div>
              <div class="order-card-foot"><div><p>${order.item_count} item(s) · ${app.escapeHTML(order.payment_method)}</p><strong class="price">${app.money(order.total_amount)}</strong></div><a class="button button-light" href="/order-details.html?id=${encodeURIComponent(order.order_id)}">View details ↗</a></div>
            </article>`,
      )
      .join("");
  } catch (error) {
    app.showNotice("ordersNotice", error.message, "error");
    container.innerHTML = "";
  }
})();
