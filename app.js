/* ==========================================
   SUPABASE INIT
========================================== */
console.log("➡️ app.js IS LOADED AND RUNNING");

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://rzjokszjxyfbsqegcsks.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6am9rc3pqeHlmYnNxZWdjc2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NzQ4OTgsImV4cCI6MjA3OTM1MDg5OH0.m21MAFAtNDFLweVLZQbCs9pdeOD0t4ZvIRlmYBa4EmQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ==========================================
   HELPERS
========================================== */
function sanitize(txt) {
  const div = document.createElement("div");
  div.innerText = txt ?? "";
  return div.innerHTML;
}

function safeYouTube(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (
      u.hostname.includes("youtube.com") ||
      u.hostname.includes("youtu.be")
    ) {
      return url;
    }
  } catch {}
  return "";
}

/* ==========================================
   FETCH + DISPLAY ACTIVITIES
========================================== */
async function renderActivities() {
  const container = document.getElementById("activity-list");
  if (!container) return;

  container.innerHTML = `<p class="muted">Loading activities...</p>`;

  const { data: rows, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });

  // 🔥 DEBUGGING LINES — REQUIRED
  console.log("ROWS:", rows);
  console.log("ERROR:", error);

  if (error) {
    console.error(error);
    container.innerHTML = `<p class="muted">Error loading activities.</p>`;
    return;
  }

  if (!rows || !rows.length) {
    container.innerHTML = `<p class="muted">No activities yet.</p>`;
    return;
  }

  container.innerHTML = "";

  rows.forEach((a) => {
    const card = document.createElement("div");
    card.className = "event-card fade-in-up";

    let html = `
      <p class="event-title"><strong>${sanitize(a.title)}</strong></p>
      <p class="event-date"><em>${new Date(a.datetime).toLocaleString()}</em></p>
      <p class="event-desc">${sanitize(a.desc)}</p>
      <div class="media-section">
    `;

    if (a.photos && a.photos.length > 0) {
      const items = a.photos
        .map((p) => `<div class="carousel-item"><img src="${p}" /></div>`)
        .join("");

      html += `
        <div class="carousel">
          <div class="carousel-inner">${items}</div>
          <button class="carousel-btn carousel-prev">‹</button>
          <button class="carousel-btn carousel-next">›</button>
        </div>
      `;
    }

    if (a.video) html += `<video controls src="${a.video}"></video>`;
    if (a.youtube) html += `<iframe src="${a.youtube}" allowfullscreen></iframe>`;

    html += `</div>`;
    card.innerHTML = html;
    container.appendChild(card);
    card.classList.add("visible");
    // console.log("Rendered card for:", a.title);
    

  });

  initCarousels();
}


/* ==========================================
   CAROUSEL
========================================== */
function initCarousels() {
  document.querySelectorAll(".carousel").forEach((carousel) => {
    const inner = carousel.querySelector(".carousel-inner");
    let items = carousel.querySelectorAll(".carousel-item");

    if (items.length <= 1) return;

    const clone = items[0].cloneNode(true);
    inner.appendChild(clone);
    items = carousel.querySelectorAll(".carousel-item");

    let index = 0;
    const total = items.length;

    function showSlide(i, animated = true) {
      inner.style.transition = animated ? "0.5s" : "none";
      inner.style.transform = `translateX(-${i * 100}%)`;
      index = i;
    }

    function next() {
      if (index >= total - 1) {
        showSlide(0, false);
        setTimeout(() => showSlide(1), 20);
      } else showSlide(index + 1);
    }

    function prev() {
      if (index === 0) {
        showSlide(total - 1, false);
        setTimeout(() => showSlide(total - 2), 20);
      } else showSlide(index - 1);
    }

    let auto = setInterval(next, 2500);

    carousel.querySelector(".carousel-prev").onclick = () => {
      clearInterval(auto);
      prev();
      auto = setInterval(next, 2000);
    };

    carousel.querySelector(".carousel-next").onclick = () => {
      clearInterval(auto);
      next();
      auto = setInterval(next, 2000);
    };
  });
}

/* ==========================================
   ADMIN PANEL
========================================== */
function initAdminPage() {
  const adminPage = document.getElementById("admin-page");
  if (!adminPage) return;

  const loginForm = document.getElementById("login-form");
  const authArea = document.getElementById("auth-area");
  const adminUI = document.getElementById("admin-ui");
  const activityForm = document.getElementById("activity-form");
  const adminList = document.getElementById("activity-admin-list");
  const signoutBtn = document.getElementById("signout");

  /* LOGIN */
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();
    const pass = document.getElementById("adminPass").value.trim();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) return alert("Invalid login");

    authArea.hidden = true;
    adminUI.hidden = false;
    loadAdminList();
  });

  /* LOGOUT */
  signoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    authArea.hidden = false;
    adminUI.hidden = true;
  });

  /* ADD ACTIVITY */
  activityForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = sanitize(document.getElementById("act-title").value.trim());
    const datetime = document.getElementById("act-datetime").value;
    const desc = sanitize(document.getElementById("act-desc").value.trim());
    const youtube = safeYouTube(
      document.getElementById("act-youtube").value
    );

    const photosInput = document.getElementById("act-photos");
    const videoInput = document.getElementById("act-video");

    let photoUrls = [];

    /* PHOTOS */
    for (const file of photosInput.files) {
      const fname = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `activities/photos/${Date.now()}_${fname}`;

      const upload = await supabase.storage.from("media").upload(path, file);

      if (upload.error) return alert("Photo upload failed");

      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(path);

      photoUrls.push(publicUrl);
    }

    /* VIDEO */
    let videoUrl = "";
    if (videoInput.files[0]) {
      const vfile = videoInput.files[0];
      const fname = vfile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const vpath = `activities/videos/${Date.now()}_${fname}`;

      await supabase.storage.from("media").upload(vpath, vfile);

      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(vpath);

      videoUrl = publicUrl;
    }

    /* INSERT */
    const { error } = await supabase.from("activities").insert({
      title,
      datetime,
      desc,
      photos: photoUrls,
      video: videoUrl,
      youtube,
      created_at: Date.now(),
    });

    if (error) return alert("Error saving activity");

    alert("Activity added!");
    activityForm.reset();
    loadAdminList();
    renderActivities();
  });

  /* LIST ACTIVITIES */
  async function loadAdminList() {
    adminList.innerHTML = `<p class="muted">Loading...</p>`;

    const { data: rows } = await supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false });

    adminList.innerHTML = "";

    rows.forEach((a) => {
      const row = document.createElement("div");
      row.className = "admin-list-item";

      row.innerHTML = `
        <div>
          <h4>${sanitize(a.title)}</h4>
          <div class="admin-item-meta">${new Date(
            a.datetime
          ).toLocaleString()}</div>
        </div>
      `;

      const delBtn = document.createElement("button");
      delBtn.className = "btn";
      delBtn.textContent = "Delete";

      delBtn.onclick = async () => {
        if (!confirm("Delete this activity?")) return;
        await supabase.from("activities").delete().eq("id", a.id);
        loadAdminList();
        renderActivities();
      };

      row.appendChild(delBtn);
      adminList.appendChild(row);
    });
  }
}

/* ==========================================
   CONTACT FORM
========================================== */
function initContactForm() {
  const form = document.getElementById("contact-form");
  const clearBtn = document.getElementById("clear-contact");

  if (!form) return;

  // NO preventDefault here
form.addEventListener("submit", () => {
  setTimeout(() => {
    console.log("Form submitted");
  }, 100);
});

  clearBtn.addEventListener("click", () => form.reset());
}

/* ==========================================
   ANIMATIONS
========================================== */
function initScrollAnimations() {
  const els = document.querySelectorAll(".fade-in-up");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.2 }
  );
  els.forEach((el) => observer.observe(el));
}

/* ==========================================
   INIT
========================================== */
document.addEventListener("DOMContentLoaded", () => {
  renderActivities();
  initAdminPage();
  initContactForm();
  initScrollAnimations();
});
