(function () {
  const orderId = localStorage.getItem("fashionStoreLastOrderId");
  const element = document.getElementById("confirmedOrderId");
  element.textContent = orderId
    ? `Order number: ${orderId}`
    : "Your order was processed";
  document
    .querySelectorAll("[data-year]")
    .forEach((item) => (item.textContent = new Date().getFullYear()));
})();
