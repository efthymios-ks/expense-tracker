let _accessToken = null;
let _tokenClient = null;
const STORAGE_KEY = "et_auth";
const EMAIL_KEY = "et_user_email";

function saveToken(tokenResponse) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    access_token: tokenResponse.access_token,
    expires_at: Date.now() + tokenResponse.expires_in * 1000,
  }));
}

function loadToken() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && stored.expires_at - Date.now() > 60_000) return stored.access_token;
  } catch {}
  return null;
}

function clearToken() {
  localStorage.removeItem(STORAGE_KEY);
}

async function onTokenReceived(tokenResponse, onReady) {
  _accessToken = tokenResponse.access_token;
  saveToken(tokenResponse);

  const userResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${_accessToken}` },
  });
  const userInfo = await userResp.json();

  if (!CONFIG.ALLOWED_EMAILS.includes(userInfo.email)) {
    clearToken();
    window.location.href = `401.html?email=${encodeURIComponent(userInfo.email)}`;
    return;
  }

  window.state.currentUserEmail = userInfo.email;
  localStorage.setItem(EMAIL_KEY, userInfo.email);

  document.getElementById("authOverlay").classList.replace("d-flex", "d-none");
  document.getElementById("mainContent").classList.remove("d-none");
  onReady();
}

function initAuth(onReady) {
  // Use stored token if still valid
  const cached = loadToken();
  if (cached) {
    _accessToken = cached;
    window.state.currentUserEmail = localStorage.getItem(EMAIL_KEY) || "";
    document.getElementById("authOverlay").classList.replace("d-flex", "d-none");
    document.getElementById("mainContent").classList.remove("d-none");
    onReady();
    return;
  }

  const waitForGIS = () => {
    if (typeof google === "undefined" || !google.accounts) {
      setTimeout(waitForGIS, 100);
      return;
    }

    _tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/spreadsheets email profile",
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          console.error("Auth error:", tokenResponse.error);
          alert(`Sign-in failed: ${tokenResponse.error}`);
          return;
        }
        try {
          await onTokenReceived(tokenResponse, onReady);
        } catch (error) {
          console.error("Failed to verify email:", error);
          alert("Authentication failed. Please try again.");
        }
      },
    });

    document.getElementById("signInBtn").onclick = () => {
      _tokenClient.requestAccessToken({ prompt: "select_account" });
    };

    // Silent re-auth if Google session is still alive
    _tokenClient.requestAccessToken({ prompt: "" });
  };

  waitForGIS();
}

function getToken() {
  return _accessToken;
}

window.auth = { initAuth, getToken };
