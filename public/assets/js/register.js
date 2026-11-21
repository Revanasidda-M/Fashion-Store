(function () {
  const app = window.StoreApp;
  const form = document.getElementById("registerForm");
  const submit = document.getElementById("registerSubmit");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (document.getElementById("password").value.length < 8) {
      app.showNotice(
        "registerNotice",
        "Password must contain at least 8 characters.",
        "error",
      );
      return;
    }
    submit.disabled = true;
    submit.textContent = "Creating account…";
    try {
      const result = await app.apiRequest("/auth/register", {
        method: "POST",
        auth: false,
        body: {
          name: document.getElementById("name").value.trim(),
          email: document.getElementById("email").value.trim(),
          phone: document.getElementById("phone").value.trim(),
          password: document.getElementById("password").value,
        },
      });

      // Auto-login upon registration
      if (result.token && result.user) {
        localStorage.setItem("fashionStoreToken", result.token);
        localStorage.setItem("fashionStoreUser", JSON.stringify(result.user));
      }

      // Store local account backup to survive serverless instance cold starts
      if (result.userRecord) {
        try {
          const accounts = JSON.parse(
            localStorage.getItem("fashionStoreAccounts") || "{}",
          );
          accounts[result.userRecord.email.toLowerCase()] = result.userRecord;
          localStorage.setItem(
            "fashionStoreAccounts",
            JSON.stringify(accounts),
          );
        } catch {}
      }

      app.showNotice(
        "registerNotice",
        "Account created successfully! Redirecting…",
        "success",
      );
      form.reset();
      setTimeout(() => {
        window.location.href = "/index.html";
      }, 700);
    } catch (error) {
      app.showNotice("registerNotice", error.message, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "Create account";
    }
  });
})();
