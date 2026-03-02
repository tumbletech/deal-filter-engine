// ====== CONFIG ======
// Put your n8n webhook URL here:
const N8N_WEBHOOK_URL = "https://tumbletech.app.n8n.cloud/webhook-test/presalesqual";

// ====== Helpers ======
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const form = $("#presalesForm");
const steps = $$("[data-step]");
const backBtn = $("#backBtn");
const nextBtn = $("#nextBtn");
const submitBtn = $("#submitBtn");
const statusBox = $("#statusBox");
const reviewBox = $("#reviewBox");
const progressBar = $("#progressBar");

const proposalTypeEl = $("#proposalType");
const descEl = $("#description");
const descCount = $("#descCount");

let currentStep = 1;
const totalSteps = 6;

// Required fields by type (MVP rules)
const requiredByType = {
  "Land Sale": ["landArea", "askingPrice", "titleStatus", "zoning"],
  "Joint Venture": ["jvLandEquity", "jvRevenueShare", "jvFeasibility", "jvTitleStatus"],
  "Bulk Purchase": ["bulkBudget", "bulkFinancing"],
  "Investor Partnership": ["invCapital", "invProof"],
  "Construction Proposal": ["conCompanyType"]
};

// Always required (base)
const baseRequired = ["fullName","company","email","phone","role","decisionMaker","proposalType","location","timeline","description"];

function setStatus(msg, type="") {
  statusBox.classList.remove("ok","bad");
  statusBox.textContent = msg || "";
  if (type === "ok") statusBox.classList.add("ok");
  if (type === "bad") statusBox.classList.add("bad");
}

function setError(fieldName, msg) {
  const el = $(`[data-error-for="${fieldName}"]`);
  if (el) el.textContent = msg || "";
}

function clearErrors() {
  $$("[data-error-for]").forEach(e => e.textContent = "");
}

function showStep(n) {
  currentStep = n;
  steps.forEach(s => s.classList.toggle("is-active", Number(s.dataset.step) === n));

  // Buttons
  backBtn.disabled = n === 1;
  nextBtn.classList.toggle("is-hidden", n === totalSteps);
  submitBtn.classList.toggle("is-hidden", n !== totalSteps);

  // Progress
  const pct = ((n - 1) / (totalSteps - 1)) * 100;
  progressBar.style.width = `${pct}%`;

  // Step labels
  $$("[data-step-label]").forEach(lbl => {
    const sn = Number(lbl.dataset.stepLabel);
    lbl.classList.toggle("is-active", sn === n);
    lbl.classList.toggle("is-done", sn < n);
  });
  $$("[data-step-title]").forEach(t => {
    const sn = Number(t.dataset.stepTitle);
    t.classList.toggle("is-active", sn === n);
  });

  // Clear status unless review step
  if (n !== 6) setStatus("");

  // If review step, build review
  if (n === 6) buildReview();
}

function getFormData() {
  const fd = new FormData(form);
  const obj = {};
  for (const [k, v] of fd.entries()) obj[k] = (v || "").toString().trim();
  return obj;
}

function visibleConditionalFieldsForType(type) {
  // Return list of fields that become required for that type
  return requiredByType[type] || [];
}

function updateConditionalSections() {
  const type = proposalTypeEl.value;
  $$(".conditional").forEach(sec => {
    const showFor = sec.dataset.showFor;
    sec.classList.toggle("is-visible", showFor === type);
  });
}

function validateEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function validateStep(stepNumber) {
  clearErrors();
  const data = getFormData();
  let ok = true;

  // Common validators for specific steps
  const require = (name, msg="Required.") => {
    if (!data[name]) { setError(name, msg); ok = false; }
  };

  if (stepNumber === 1) {
    require("fullName");
    require("company");
    require("email");
    require("phone");
    require("role");
    require("decisionMaker");
    if (data.email && !validateEmail(data.email)) {
      setError("email", "Enter a valid email.");
      ok = false;
    }
  }

  if (stepNumber === 2) {
    require("proposalType");
    require("location");
  }

  if (stepNumber === 3) {
    const type = data.proposalType;
    const fields = visibleConditionalFieldsForType(type);
    fields.forEach(f => require(f));

    // Extra small sanity checks (lightweight)
    if (type === "Joint Venture" && data.jvRevenueShare && data.jvRevenueShare.length < 3) {
      setError("jvRevenueShare", "Provide a % split (e.g., 40/60).");
      ok = false;
    }
  }

  if (stepNumber === 4) {
    require("timeline");
  }

  if (stepNumber === 5) {
    require("description", "Provide a detailed description (min 150 characters).");
    const len = (data.description || "").length;
    if (len > 0 && len < 150) {
      setError("description", `Too short. Add ${150 - len} more characters.`);
      ok = false;
    }
  }

  return ok;
}

function validateAll() {
  // Validate each step quickly
  for (let s = 1; s <= 5; s++) {
    if (!validateStep(s)) return false;
  }
  return true;
}

function buildReview() {
  const data = getFormData();

  // Build a clean review list
  const entries = [
    ["Full Name", data.fullName],
    ["Company", data.company],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Role", data.role],
    ["Final Decision-Maker", data.decisionMaker],
    ["Proposal Type", data.proposalType],
    ["Location", data.location],
    ["Timeline", data.timeline],
  ];

  // Type-specific
  if (data.proposalType === "Land Sale") {
    entries.push(["Land Area", data.landArea]);
    entries.push(["Asking Price", data.askingPrice]);
    entries.push(["Title Status", data.titleStatus]);
    entries.push(["Zoning", data.zoning]);
    entries.push(["Utilities", data.utilities]);
    entries.push(["Encumbrances", data.encumbrances]);
  } else if (data.proposalType === "Joint Venture") {
    entries.push(["Land Equity Value", data.jvLandEquity]);
    entries.push(["Revenue Share", data.jvRevenueShare]);
    entries.push(["Feasibility Available", data.jvFeasibility]);
    entries.push(["Title Status", data.jvTitleStatus]);
  } else if (data.proposalType === "Bulk Purchase") {
    entries.push(["Budget Range", data.bulkBudget]);
    entries.push(["Financing Ready", data.bulkFinancing]);
    entries.push(["Target Units / Quantity", data.bulkUnits]);
  } else if (data.proposalType === "Investor Partnership") {
    entries.push(["Available Capital", data.invCapital]);
    entries.push(["Proof of Funds", data.invProof]);
  } else if (data.proposalType === "Construction Proposal") {
    entries.push(["Company Type", data.conCompanyType]);
    entries.push(["Licenses / PCAB", data.conLicenses]);
    entries.push(["Portfolio Link", data.conPortfolio]);
  }

  entries.push(["Description", data.description]);
  entries.push(["Additional Notes", data.notes]);
  entries.push(["Availability", data.availability]);

  reviewBox.innerHTML = entries
    .filter(([k,v]) => (v ?? "").toString().trim() !== "")
    .map(([k,v]) => `
      <div class="row">
        <div class="k">${escapeHtml(k)}</div>
        <div class="v">${escapeHtml(v)}</div>
      </div>
    `).join("");

  // Final pre-submit status
  if (N8N_WEBHOOK_URL.includes("YOUR_N8N_WEBHOOK_URL_HERE")) {
    setStatus("Webhook URL not configured yet. Set N8N_WEBHOOK_URL in script.js before submitting.", "bad");
  } else {
    setStatus("Ready to submit. This will send the data for scoring + AI brief generation.", "");
  }
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ====== Events ======
proposalTypeEl.addEventListener("change", () => {
  updateConditionalSections();
});

descEl.addEventListener("input", () => {
  descCount.textContent = String(descEl.value.length);
});

nextBtn.addEventListener("click", () => {
  if (!validateStep(currentStep)) return;
  showStep(Math.min(totalSteps, currentStep + 1));
});

backBtn.addEventListener("click", () => {
  showStep(Math.max(1, currentStep - 1));
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Full validation
  if (!validateAll()) {
    setStatus("Please fix the highlighted fields before submitting.", "bad");
    // jump to first invalid step (quick approach)
    for (let s = 1; s <= 5; s++) {
      if (!validateStep(s)) { showStep(s); return; }
    }
    return;
  }

  if (N8N_WEBHOOK_URL.includes("YOUR_N8N_WEBHOOK_URL_HERE")) {
    setStatus("Set N8N_WEBHOOK_URL in script.js first.", "bad");
    return;
  }

  const payload = getFormData();

  // Add metadata (useful for n8n logs)
  payload._meta = {
    source: "tumbletech-presales-dev-v1",
    submitted_at_iso: new Date().toISOString(),
    user_agent: navigator.userAgent
  };

  // UI lock
  submitBtn.disabled = true;
  backBtn.disabled = true;
  nextBtn.disabled = true;
  setStatus("Submitting…", "");

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`.trim());
    }

    setStatus("Submitted successfully. Your inquiry will be evaluated and routed accordingly.", "ok");
    form.reset();
    descCount.textContent = "0";
    updateConditionalSections();
    // Back to step 1 after a moment
    setTimeout(() => showStep(1), 900);
  } catch (err) {
    setStatus(`Submission failed: ${err.message}`, "bad");
  } finally {
    submitBtn.disabled = false;
    backBtn.disabled = false;
    nextBtn.disabled = false;
  }
});

// ====== Init ======
$("#year").textContent = new Date().getFullYear();
updateConditionalSections();
descCount.textContent = "0";
showStep(1);
