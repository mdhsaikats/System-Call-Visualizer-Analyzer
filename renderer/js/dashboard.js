// Initialize Lucide Icons
lucide.createIcons();

import { logout, observeAuth } from "./auth.js";

// Hide main content until auth is checked
document.body.style.visibility = "hidden";
const loadingOverlay = document.getElementById("loadingOverlay");
if (loadingOverlay) loadingOverlay.style.display = "flex";

observeAuth((user) => {
  if (!user) {
    if (loadingOverlay) loadingOverlay.style.display = "flex";
    document.body.style.visibility = "visible";
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
  } else {
    if (loadingOverlay) loadingOverlay.style.display = "none";
    document.body.style.visibility = "visible";
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await logout();
    window.location.href = "index.html";
    console.log("Logged out successfully");
  } catch (error) {
    console.error("Logout failed:", error);
  }
});
