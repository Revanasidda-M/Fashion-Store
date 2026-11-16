(async function () {
  const app = window.StoreApp;
  const productsContainer = document.getElementById("productsContainer");
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const sortFilter = document.getElementById("sortFilter");
  const categoryPills = document.getElementById("categoryPills");
  const resultsCount = document.getElementById("resultsCount");
  let products = [];
  let categories = [];

  const params = new URLSearchParams(window.location.search);
  const categoryFromUrl = params.get("category") || "";
  const searchFromUrl = params.get("q") || "";
  const sortFromUrl = params.get("sort") || "";
  searchInput.value = searchFromUrl;
  if (sortFilter && sortFromUrl) {
    sortFilter.value = sortFromUrl;
  }

  function updateActivePill(currentCategory) {
    if (!categoryPills) return;
    const pills = categoryPills.querySelectorAll(".category-pill");
    pills.forEach((pill) => {
      if (pill.dataset.category.toLowerCase() === currentCategory.toLowerCase()) {
        pill.classList.add("active");
      } else {
        pill.classList.remove("active");
      }
    });
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();
    const categoryName = categoryFilter.value;
    const sortOption = sortFilter ? sortFilter.value : "";

    let filtered = products.filter((product) => {
      const haystack =
        `${product.product_name} ${product.description} ${product.brand} ${product.category_name}`.toLowerCase();
      return (
        haystack.includes(query) &&
        (!categoryName || product.category_name.toLowerCase() === categoryName.toLowerCase())
      );
    });

    if (sortOption === "price-asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortOption === "price-desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortOption === "name-asc") {
      filtered.sort((a, b) => a.product_name.localeCompare(b.product_name));
    } else if (sortOption === "name-desc") {
      filtered.sort((a, b) => b.product_name.localeCompare(a.product_name));
    } else if (sortOption === "brand-asc") {
      filtered.sort((a, b) => a.brand.localeCompare(b.brand));
    }

    updateActivePill(categoryName);

    const activeCatLabel = categoryName ? ` in ${categoryName}` : "";
    resultsCount.textContent = `Showing ${filtered.length} of ${products.length} products${activeCatLabel}`;
    productsContainer.innerHTML = filtered.length
      ? filtered.map(app.renderProductCard).join("")
      : '<div class="empty-state"><h2>No products found</h2><p>Try another search or choose a different category or sort option.</p><button class="button button-light" id="clearFilters" type="button">Clear filters</button></div>';
    document.getElementById("clearFilters")?.addEventListener("click", () => {
      searchInput.value = "";
      categoryFilter.value = "";
      if (sortFilter) sortFilter.value = "";
      syncUrl();
      render();
    });
  }

  function syncUrl() {
    const queryParams = new URLSearchParams();
    if (categoryFilter.value) queryParams.set("category", categoryFilter.value);
    if (searchInput.value.trim())
      queryParams.set("q", searchInput.value.trim());
    if (sortFilter && sortFilter.value)
      queryParams.set("sort", sortFilter.value);
    const nextUrl = `/products.html${queryParams.size ? `?${queryParams.toString()}` : ""}`;
    history.replaceState(null, "", nextUrl);
  }

  if (categoryPills) {
    categoryPills.addEventListener("click", (event) => {
      const button = event.target.closest(".category-pill");
      if (!button) return;
      categoryFilter.value = button.dataset.category || "";
      syncUrl();
      render();
    });
  }

  try {
    const [categoryResult, productResult] = await Promise.all([
      app.apiRequest("/categories", { auth: false }),
      app.apiRequest("/products", { auth: false }),
    ]);
    categories = categoryResult.categories;
    products = productResult.products;
    categoryFilter.innerHTML =
      '<option value="">All categories</option>' +
      categories
        .map(
          (category) =>
            `<option value="${app.escapeHTML(category.category_name)}">${app.escapeHTML(category.category_name)}</option>`,
        )
        .join("");
    if (
      categories.some(
        (category) =>
          category.category_name.toLowerCase() === categoryFromUrl.toLowerCase(),
      )
    ) {
      const matched = categories.find(
        (c) => c.category_name.toLowerCase() === categoryFromUrl.toLowerCase(),
      );
      categoryFilter.value = matched.category_name;
    }
    render();
  } catch (error) {
    resultsCount.textContent = "Unable to load the catalogue.";
    productsContainer.innerHTML = `<div class="empty-state"><h2>Could not load products</h2><p>${app.escapeHTML(error.message)}</p><a class="button" href="/index.html">Return home</a></div>`;
  }

  searchInput.addEventListener("input", () => {
    syncUrl();
    render();
  });
  categoryFilter.addEventListener("change", () => {
    syncUrl();
    render();
  });
  if (sortFilter) {
    sortFilter.addEventListener("change", () => {
      syncUrl();
      render();
    });
  }
})();
