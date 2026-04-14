lucide.createIcons();
import { auth, login } from "./auth.js";

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("errorMsg");

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  try {
    const user = await login(email, password);
    console.log("Logged in:", user.user.email);
    window.location.href = "dashboard.html";
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.classList.remove("hidden");
  }
});

const loginBtn = document.getElementById("loginBtn");
const btnText = document.getElementById("btnText");
const spinner = document.getElementById("spinner");
const arrowIcon = document.getElementById("arrowIcon");

loginBtn.addEventListener("click", async () => {
  // 🔥 Start Loading
  btnText.textContent = "Initializing...";
  spinner.classList.remove("hidden");
  arrowIcon.classList.add("hidden");

  loginBtn.disabled = true;
  loginBtn.classList.add("opacity-70", "cursor-not-allowed");

  try {
    // simulate login / API / Firebase call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("Session started");
  } catch (err) {
    console.error(err);
  }

  // 🔥 Stop Loading
  btnText.textContent = "Initialize Session";
  spinner.classList.add("hidden");
  arrowIcon.classList.remove("hidden");

  loginBtn.disabled = false;
  loginBtn.classList.remove("opacity-70", "cursor-not-allowed");
});


