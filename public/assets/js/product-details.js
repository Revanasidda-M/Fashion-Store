(async function () {
  const app = window.StoreApp;
  const container = document.getElementById("productDetails");
  const productId = new URLSearchParams(window.location.search).get("id");
  let product = null;
  let selectedSize = "";

  if (!productId) {
    container.innerHTML =
      '<div class="empty-state"><h2>Choose a product</h2><p>Open product details from the shop catalogue.</p><a class="button" href="/products.html">Browse products</a></div>';
    return;
  }

  try {
    const result = await app.apiRequest(
      `/products/${encodeURIComponent(productId)}`,
      { auth: false },
    );
    product = result.product;
    document.title = `${product.product_name} | Fashion Store`;
    const sizesHtml = product.sizes
      .map(
        (size) =>
          `<button class="size-option" type="button" data-size="${app.escapeHTML(size.size)}" ${size.stock < 1 ? "disabled" : ""}>${app.escapeHTML(size.size)}${size.stock < 1 ? " · sold out" : ""}</button>`,
      )
      .join("");
    container.innerHTML = `
            <div class="product-detail">
                <div class="detail-image"><img src="${app.getImageUrl(product.image)}" alt="${app.escapeHTML(product.product_name)}" onerror="this.src='/images/placeholder.svg'"></div>
                <section class="detail-info">
                    <p class="eyebrow">${app.escapeHTML(product.category_name)} / ${app.escapeHTML(product.brand)}</p>
                    <h1>${app.escapeHTML(product.product_name)}</h1>
                    <span class="price">${app.money(product.price)}</span>
                    <p class="description">${app.escapeHTML(product.description)}</p>
                    <div class="detail-meta"><span>Brand</span><strong>${app.escapeHTML(product.brand)}</strong><span>Availability</span><strong>${product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</strong></div>
                    <div class="form-field"><label>Choose size</label><div class="size-list" id="sizeList">${sizesHtml}</div><small id="sizeHelp">Select an available size before adding to cart.</small></div>
                    <div class="form-field"><label for="quantity">Quantity</label><input class="field quantity-input" id="quantity" type="number" min="1" value="1" max="${product.stock}" ${product.stock < 1 ? "disabled" : ""}></div>
                    <div id="productNotice" class="notice" hidden></div>
                    <div class="detail-actions"><button class="button button-accent" id="addToCartButton" type="button" ${product.stock < 1 ? "disabled" : ""}>Add to cart</button><a class="button button-light" href="/products.html">Back to shop</a></div>
                </section>
            </div>`;

    document.querySelectorAll(".size-option").forEach((button) =>
      button.addEventListener("click", () => {
        document
          .querySelectorAll(".size-option")
          .forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        selectedSize = button.dataset.size;
        const matchingSize = product.sizes.find(
          (item) => item.size === selectedSize,
        );
        document.getElementById("quantity").max = String(matchingSize.stock);
        if (
          Number(document.getElementById("quantity").value) > matchingSize.stock
        )
          document.getElementById("quantity").value = String(
            Math.max(1, matchingSize.stock),
          );
        document.getElementById("sizeHelp").textContent =
          `${matchingSize.stock} available in size ${selectedSize}.`;
      }),
    );

    document
      .getElementById("addToCartButton")
      .addEventListener("click", async () => {
        if (!app.getToken()) {
          const next = `/product-details.html?id=${encodeURIComponent(product.product_id)}`;
          window.location.href = `/login.html?next=${encodeURIComponent(next)}`;
          return;
        }
        if (!selectedSize) {
          app.showNotice(
            "productNotice",
            "Please choose a size first.",
            "error",
          );
          return;
        }
        const quantity = Number(document.getElementById("quantity").value);
        if (!Number.isInteger(quantity) || quantity < 1) {
          app.showNotice("productNotice", "Enter a valid quantity.", "error");
          return;
        }
        const button = document.getElementById("addToCartButton");
        button.disabled = true;
        try {
          await app.apiRequest("/cart", {
            method: "POST",
            body: {
              productId: product.product_id,
              size: selectedSize,
              quantity,
            },
          });
          app.showNotice("productNotice", "Added to your cart.", "success");
          await app.updateCartCount();
        } catch (error) {
          app.showNotice("productNotice", error.message, "error");
        } finally {
          button.disabled = false;
        }
      });
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h2>Product not found</h2><p>${app.escapeHTML(error.message)}</p><a class="button" href="/products.html">Return to shop</a></div>`;
  }
})();
