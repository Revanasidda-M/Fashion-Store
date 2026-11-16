(function () {
  const app = window.StoreApp;
  const form = document.getElementById("loginForm");
  const submit = document.getElementById("loginSubmit");
  const next = new URLSearchParams(window.location.search).get("next");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    submit.textContent = "Signing in…";
    app.showNotice("loginNotice", "", "info");
    try {
      const result = await app.apiRequest("/auth/login", {
        method: "POST",
        auth: false,
        body: {
          email: document.getElementById("email").value.trim(),
          password: document.getElementById("password").value,
        },
      });
      localStorage.setItem("fashionStoreToken", result.token);
      localStorage.setItem("fashionStoreUser", JSON.stringify(result.user));
      app.showNotice(
        "loginNotice",
        "Login successful. Redirecting…",
        "success",
      );
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/index.html";
      window.location.href = safeNext;
    } catch (error) {
      app.showNotice("loginNotice", error.message, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "Log in";
    }
  });
})();
