// ---- 1. Dynamic Browser Title Updater ----
const BASE_TITLE = "HSA Study";
const SECTION_NAMES = {
  hero: "Home",
  features: "Features",
  "how-it-works": "Help",
  testimonials: "Feedback",
  pricing: "Pricing",
  start: "Sign In",
  contact: "Contact",
};

const sections = Object.keys(SECTION_NAMES)
  .map((id) => document.getElementById(id))
  .filter(Boolean);

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible) {
      const name = SECTION_NAMES[visible.target.id];
      document.title = name ? `${name} — ${BASE_TITLE}` : BASE_TITLE;
    }
  },
  {
    rootMargin: "-45% 0px -50% 0px",
    threshold: 0,
  }
);

sections.forEach((section) => observer.observe(section));


// ---- 2. Google OAuth & Auth State Management ----

// Paste your real Google Client ID here
const GOOGLE_CLIENT_ID = "1035654595541-7vr3gkalutv66asdvt6pcd7kk0j47r62.apps.googleusercontent.com";
const API_BASE = window.location.origin;

const navArea = document.getElementById("auth-area-nav");
const ctaArea = document.getElementById("auth-area-cta");

function renderSignedOut() {
  if (!navArea || !ctaArea) return;
  navArea.innerHTML = "";
  ctaArea.innerHTML = "";
  
  if (window.google?.accounts?.id) {
    window.google.accounts.id.renderButton(navArea, {
      theme: "outline",
      size: "medium",
      text: "signin",
      shape: "pill",
    });
    window.google.accounts.id.renderButton(ctaArea, {
      theme: "filled_blue",
      size: "large",
      text: "signup_with",
      shape: "pill",
    });
  }
}

function renderSignedIn(user) {
  if (!navArea || !ctaArea) return;

  navArea.innerHTML = `
    <span class="header-button" style="display:flex;align-items:center;gap:8px;cursor:pointer;" id="logout-btn-nav">
      <img src="${user.picture}" alt="" style="width:22px;height:22px;border-radius:50%;" />
      ${user.name.split(" ")[0]}
    </span>`;
    
  ctaArea.innerHTML = `
    <a href="#" class="cta-primary-button" id="logout-btn-cta">
      <span>Signed in as ${user.name} — Log out</span>
    </a>`;

  document.getElementById("logout-btn-nav")?.addEventListener("click", logout);
  document.getElementById("logout-btn-cta")?.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
}

async function handleCredentialResponse(response) {
  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Sign-in failed");
    }

    const { user } = await res.json();
    renderSignedIn(user);
  } catch (err) {
    console.error("Sign-in failed:", err);
    alert("Sign-in failed. Please try again.");
  }
}

async function logout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("Logout request failed:", err);
  } finally {
    renderSignedOut();
  }
}

async function checkExistingSession() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
    if (res.ok) {
      const { user } = await res.json();
      renderSignedIn(user);
      return;
    }
  } catch (err) {
    console.error("Could not reach backend:", err);
  }
  renderSignedOut();
}

window.onload = function () {
  if (!window.google || GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID")) {
    console.warn(
      "Google Sign-In not configured: Update GOOGLE_CLIENT_ID in script.js and server.js with your real Client ID."
    );
    return;
  }
  
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
  });
  
  checkExistingSession();
};