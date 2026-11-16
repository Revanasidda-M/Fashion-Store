(async function () {
  const app = window.StoreApp;
  document
    .querySelectorAll("[data-year]")
    .forEach((element) => (element.textContent = new Date().getFullYear()));
  const categoryContainer = document.getElementById("categoriesContainer");
  const productsContainer = document.getElementById("productsContainer");

  try {
    const result = await app.apiRequest("/categories", { auth: false });
    categoryContainer.innerHTML = result.categories
      .map(
        (category) => `
            <a class="category-card" href="/products.html?category=${encodeURIComponent(category.category_name)}">
                <img src="${app.getImageUrl(category.image)}" alt="${app.escapeHTML(category.category_name)}" loading="lazy" onerror="this.src='/images/placeholder.svg'">
                <div class="category-card-body"><h3>${app.escapeHTML(category.category_name)}</h3><p>${app.escapeHTML(category.description)}</p></div>
            </a>`,
      )
      .join("");
  } catch (error) {
    categoryContainer.innerHTML = `<div class="empty-state"><h2>Categories are unavailable</h2><p>${app.escapeHTML(error.message)}</p></div>`;
  }

  try {
    const result = await app.apiRequest("/products", { auth: false });
    const featured = result.products.slice(0, 8);
    productsContainer.innerHTML = featured.length
      ? featured.map(app.renderProductCard).join("")
      : '<div class="empty-state"><h2>No products yet</h2><p>Add products to the store catalogue.</p></div>';
  } catch (error) {
    productsContainer.innerHTML = `<div class="empty-state"><h2>Products are unavailable</h2><p>${app.escapeHTML(error.message)}</p></div>`;
  }
})();
