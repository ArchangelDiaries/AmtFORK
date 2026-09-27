// Connects The Herald's Call to Firebase (Firestore for data, Google sign-in for people).
// The page asks for "db" and "user"; this file answers with Firestore and the signed-in account.
(function () {
  const cfg = window.HERALD_FIREBASE_CONFIG;
  if (!window.firebase || !cfg || !cfg.apiKey || cfg.apiKey.indexOf('PASTE') === 0) {
    console.warn("The Herald's Call: Firebase isn't configured yet. Fill in firebase-config.js.");
    return; // the page falls back to its "not connected" preview
  }
  // Reuse the Firebase app your other apps set up, if one is already running on the page.
  if (!firebase.apps.length) firebase.initializeApp(cfg);
  const fs = firebase.firestore();
  // Every Herald's Call collection gets this prefix, so it never touches
  // Field Marshal, Award Scribe or FORK data in the same project.
  const P = (window.HERALD_COLLECTION_PREFIX == null) ? 'herald_' : window.HERALD_COLLECTION_PREFIX;
  const db = {
    collection: function (n) { return fs.collection(P + n); },
    doc: function (path) { return fs.doc(P + path); },
    // Private reviews on calls this person posted (the rules only let hosts read their own).
    reviewsFor: function (uid) { return fs.collection(P + 'reviews').where('callOwner', '==', uid); }
  };
  const auth = firebase.auth();

  const ready = new Promise(function (resolve) {
    const stop = auth.onAuthStateChanged(function (u) { stop(); resolve(u); });
  });

  let officer = null;
  async function isOfficer() {
    if (officer !== null) return officer;
    const u = await ready;
    if (!u) { officer = false; return false; }
    // Signed in with ORK and currently a kingdom (or principality) officer, as checked at sign-in.
    try { const t = await u.getIdTokenResult(); if (t.claims && t.claims.kingdomOfficer === true) { officer = true; return true; } } catch (e) {}
    if (!u.email) { officer = false; return false; }
    try { officer = (await fs.doc(P + 'officers/' + u.email.toLowerCase()).get()).exists; }
    catch (e) { officer = false; }
    return officer;
  }

  const user = {
    id: async function () { const u = await ready; return u ? u.uid : null; },
    canEdit: isOfficer,
    isOwner: isOfficer,
    can: async function () { return !!(await ready); }
  };

  window.claude = {
    use: async function (name) {
      if (name === 'db') { await ready; return db; }
      if (name === 'user') { await ready; return user; }
      return null;
    }
  };

  // Sign-in / sign-out control in the header
  function mountAuth(u) {
    const top = document.querySelector('.top');
    if (!top) return;
    const box = document.createElement('div');
    box.className = 'auth';
    const role = document.getElementById('role');
    if (role) box.appendChild(role);
    const btn = document.createElement('button');
    btn.className = u ? 'btn ghost sm' : 'btn sm';
    btn.textContent = u ? 'Sign out' : 'Sign in with Google';
    btn.title = u ? ('Signed in as ' + (u.displayName || u.email || '')) : 'Sign in to build and submit bids';
    btn.addEventListener('click', async function () {
      try {
        if (u) await auth.signOut();
        else await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        location.reload();
      } catch (e) { console.error(e); }
    });
    box.appendChild(btn);
    if (!u) {  // Sign in with ORK happens on FORK's sign-in page, then comes back here (same site, same sign-in).
      const ork = document.createElement('a');
      ork.className = 'btn sm'; ork.textContent = 'Sign in with ORK';
      ork.href = '/signin?next=' + encodeURIComponent(location.pathname + location.search);
      box.appendChild(ork);
    }
    top.appendChild(box);
  }
  ready.then(function (u) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mountAuth(u); });
    else mountAuth(u);
  });
})();
