(async function () {
  const app = window.StoreApp;
  const form = document.getElementById("profileForm");
  const saveButton = document.getElementById("saveProfileButton");
  try {
    const result = await app.apiRequest("/profile");
    const user = result.user;
    for (const field of [
      "name",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "pincode",
    ]) {
      document.getElementById(field).value = user[field] || "";
    }
    document.getElementById("profileAvatar").textContent = (user.name || "U")
      .trim()
      .charAt(0)
      .toUpperCase();
    document.getElementById("profileSideName").textContent =
      user.name || "Your profile";
    document.getElementById("profileSideEmail").textContent = user.email || "";
    const storedUser = app.currentUser() || {};
    localStorage.setItem(
      "fashionStoreUser",
      JSON.stringify({ ...storedUser, ...user }),
    );
  } catch (error) {
    app.showNotice("profileNotice", error.message, "error");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveButton.disabled = true;
    saveButton.textContent = "Saving…";
    try {
      const result = await app.apiRequest("/profile", {
        method: "PUT",
        body: {
          name: document.getElementById("name").value.trim(),
          phone: document.getElementById("phone").value.trim(),
          address: document.getElementById("address").value.trim(),
          city: document.getElementById("city").value.trim(),
          state: document.getElementById("state").value.trim(),
          pincode: document.getElementById("pincode").value.trim(),
        },
      });
      localStorage.setItem("fashionStoreUser", JSON.stringify(result.user));
      document.getElementById("profileSideName").textContent = result.user.name;
      document.getElementById("profileAvatar").textContent = result.user.name
        .trim()
        .charAt(0)
        .toUpperCase();
      app.showNotice("profileNotice", result.message, "success");
    } catch (error) {
      app.showNotice("profileNotice", error.message, "error");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save changes";
    }
  });
})();
