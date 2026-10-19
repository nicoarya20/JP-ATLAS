// Auth module: Google login, account picker, pending-approval profile, access denied.
// Sample sign-up: Budi Santoso (pending in D.users); his personal Gmail is the rejected account.
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .au-page { display: flex; flex-direction: column; padding: var(--sp-5) var(--sp-6); }
    .au-pad { padding: var(--sp-5) var(--sp-6); }
    .au-pad-x { padding: 0 var(--sp-6); }
    .au-page-flush { display: flex; flex-direction: column; }
    .au-g { display: grid; place-items: center; font-size: var(--fs-xs); font-weight: 700; }
    .au-logo { width: 44px; height: 44px; border-radius: 50%; font-size: var(--fs-caption); }
    .au-photo { width: 72px; height: 72px; border-radius: 50%; }
    .au-google { background: none; } .au-google h1 { font-size: var(--fs-sm); font-weight: 400; }
    .au-links { display: flex; gap: var(--sp-4); }
    .au-alert { padding: var(--sp-5); }
    .au-mark { width: 36px; height: 36px; border-radius: 50%; font-size: var(--fs-h2); }`;
  document.head.appendChild(style);

  const G = '<span class="icon round au-g" style="--s:26px">G</span>';
  const brand = () => `<div class="stack sm"><div class="row-flex">
      <span class="media au-logo">Logo</span><span class="title">[App Name]</span></div>
    <p>Manage team projects with ease</p></div>`;
  const signIn = () => `<div class="stack mt-2"><h2 class="h2">Sign in to your account</h2>
    ${UI.btn(`${G} Sign in with Google`, 'outline', { go: 'auth.account', block: true })}
    <p class="small muted">No account yet? Just sign in with Google.<br>New accounts need admin approval before they can be used.</p></div>`;
  const footer = '<div class="spacer"></div><p class="small muted center">Help · Privacy Policy</p>';

  App.screen('auth.login', { title: '① Login', group: 'Login & Registration', render: () => `
    <div class="content stack au-page">
      ${UI.media('Illustration / image', 240)}${brand()}${signIn()}${footer}
    </div>` });

  App.screen('auth.account', { title: '② Choose Google account', group: 'Login & Registration', render: () => `
    <header class="appbar au-google">${G}<h1>Sign in with Google</h1></header>
    <div class="content flush au-page-flush">
      <div class="au-pad stack sm"><h2 class="title">Choose an account</h2>
        <p>to continue to [App Name]</p></div>
      <div class="list au-pad-x">
        ${UI.item({ lead: UI.avatar(40, 'Budi'), title: '<b>Budi Santoso</b>', sub: '<span class="small muted">budi@kantor.id</span>', go: 'auth.pending' })}
        ${UI.item({ lead: UI.avatar(40, 'Budi'), title: '<b>Budi Santoso</b>', sub: '<span class="small muted">budi.santoso@gmail.com</span>', go: 'auth.denied' })}
        ${UI.item({ lead: UI.icon(40, true), title: '<span>Use another account</span>', sub: false, toast: 'Opens Google sign-in' })}
      </div>
      <p class="small muted au-pad">To continue, Google will share your name, email address, and profile photo with [App Name].</p>
      <div class="spacer"></div>
      <p class="small muted au-pad au-links"><span>English</span><span class="spacer"></span><span>Help</span><span>Privacy</span><span>Terms</span></p>
    </div>` });

  App.screen('auth.pending', { title: '③ Profile · Awaiting approval', group: 'Login & Registration', render: () => `
    ${UI.appbar({ title: '[App Name]', right: UI.btn('Sign out', 'outline', { go: 'auth.login', replace: true, sm: true }) })}
    <div class="content stack">
      <div class="card fill stack sm">
        <div class="between"><b>Your account is awaiting admin approval</b>${UI.pill('Pending')}</div>
        <p class="small">You can open Home once an admin approves you. Meanwhile, complete your profile below.</p>
      </div>
      <h2 class="h2 mt-2">My Profile</h2>
      <div class="row-flex"><span class="media au-photo">Photo</span>
        <div class="stack sm"><span class="small muted">Photo from Google account</span>${UI.btn('Change photo', 'outline', { sm: true, toast: 'Pick a photo' })}</div></div>
      ${UI.field('Full name *', { text: 'Budi Santoso' })}
      ${UI.field('Email (from Google, cannot be changed)', { text: 'budi@kantor.id', disabled: true })}
      ${UI.field('Nickname', { text: 'Budi' })}
      ${UI.field('Phone number', { ph: '08xx xxxx xxxx' })}
      ${UI.field('Job title', { ph: 'e.g. Finance Staff' })}
      ${UI.field('Division', { ph: 'e.g. Finance' })}
      ${UI.btn('Save profile', 'primary', { block: true, toast: 'Profile saved' })}
      ${UI.btn('Check status', 'outline', { block: true, go: 'home.main', replace: true })}
      <p class="small muted">No other menus until an admin approves your account.</p>
    </div>` });

  App.screen('auth.denied', { title: '⑤ Login · Access denied', group: 'Login & Registration', render: () => `
    <div class="content stack au-page">
      <div class="card strong stack sm au-alert">
        <div class="row-flex"><span class="badge neutral au-mark">!</span><b class="h2">Access denied</b></div>
        <span class="stack xs"><b class="small">Reason from admin:</b><p class="small">Please sign in with your office email (@kantor.id), not a personal Gmail account. — Ayu</p></span>
        <p class="small muted">This account was rejected / deactivated by an admin. You can still sign in with another Google account.</p>
      </div>
      ${brand()}${signIn()}${footer}
    </div>` });
})();
