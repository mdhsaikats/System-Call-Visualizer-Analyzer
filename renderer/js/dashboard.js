// Initialize Lucide Icons
lucide.createIcons();

import { logout, observeAuth, auth } from "./auth.js";

// Hide main content until auth is checked
document.body.style.visibility = "hidden";

const loadingOverlay = document.getElementById("loadingOverlay");
const emailBox = document.getElementById("adminEmail");
const logoutBtn = document.getElementById("logoutBtn");
const sysCallBox = document.getElementById("syscalls");

// Show loading initially
if (loadingOverlay) loadingOverlay.style.display = "flex";

/**
 * 🔐 AUTH STATE LISTENER (MAIN)
 * Handles login/logout UI updates
 */
observeAuth((user) => {
  // If NOT logged in → redirect to login page
  if (!user) {
    if (loadingOverlay) loadingOverlay.style.display = "flex";
    document.body.style.visibility = "visible";

    if (emailBox) emailBox.textContent = "No Email..";

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);

    return;
  }

  // ✅ USER IS LOGGED IN
  if (loadingOverlay) loadingOverlay.style.display = "none";
  document.body.style.visibility = "visible";

  if (emailBox) {
    emailBox.textContent = user.email; // show logged-in email
  }
});

/**
 * 🚪 LOGOUT HANDLER
 */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await logout();
      console.log("Logged out successfully");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  });
}

if (window.api && typeof window.api.onSyscalls === "function") {
  window.api.onSyscalls((value) => {
    sysCallBox.textContent = `${value.toFixed(2)} calls/sec`;
  });
}
