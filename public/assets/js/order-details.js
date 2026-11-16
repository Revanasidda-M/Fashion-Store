(async function () {
  const app = window.StoreApp;
  const container = document.getElementById("orderDetailsContainer");
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    container.innerHTML =
      '<div class="empty-state"><h2>Order ID is missing</h2><p>Open an order from your order history to see its details.</p><a class="button" href="/orders.html">Back to my orders</a></div>';
    return;
  }
  try {
    const result = await app.apiRequest(`/orders/${encodeURIComponent(id)}`);
    const order = result.order;
    document.title = `${order.order_id} | Fashion Store`;
    container.innerHTML = `
          <section class="content-card">
            <div class="order-card-head"><div><p class="eyebrow">Order confirmation</p><h2 style="margin:0 0 5px;">${app.escapeHTML(order.order_id)}</h2><p style="color:var(--muted);font-size:13px;">Placed ${new Date(order.created_at).toLocaleString()}</p></div><span class="status-pill">${app.escapeHTML(order.status)}</span></div>
            <h3 style="margin-top:25px;">Items in this order</h3>
            <div class="order-detail-list">${order.items.map((item) => `<article class="order-detail-item"><img src="${app.getImageUrl(item.image)}" alt="${app.escapeHTML(item.product_name)}" onerror="this.src='/images/placeholder.svg'"><div><h3>${app.escapeHTML(item.product_name)}</h3><p>Size: ${app.escapeHTML(item.size)}</p><p>Quantity: ${item.quantity}</p><p>Unit price: ${app.money(item.price)}</p></div><strong>${app.money(item.line_total)}</strong></article>`).join("")}</div>
            <div class="summary-row total"><span>Total</span><strong>${app.money(order.total_amount)}</strong></div>
            <h3 style="margin-top:26px;">Delivery details</h3><div class="address-block"><strong>${app.escapeHTML(order.recipient_name)}</strong><br>${app.escapeHTML(order.recipient_phone)}<br>${app.escapeHTML(order.address)}<br>${app.escapeHTML(order.city)}, ${app.escapeHTML(order.state)} - ${app.escapeHTML(order.pincode)}</div>
            <p><strong>Payment method:</strong> ${app.escapeHTML(order.payment_method)}</p>
            <a class="button button-light" href="/orders.html">← Back to my orders</a>
          </section>`;
  } catch (error) {
    app.showNotice("orderNotice", error.message, "error");
    container.innerHTML =
      '<a class="button button-light" href="/orders.html">Back to my orders</a>';
  }
})();
