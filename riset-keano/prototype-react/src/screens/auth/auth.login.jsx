// Auth ① Login, ② Google account picker, ⑤ Access denied. Sample sign-up: Budi Santoso; his personal Gmail is the rejected account.
import { CircleAlert, UserPlus } from 'lucide-react';
import { Avatar, Btn, Media, Row, Rows, Screen, Section } from '../../kit';

/** Google mark placeholder (wireframe: a round "G"). */
const G = ({ big }) => <span className={`au-g${big ? ' big' : ''}`} aria-hidden="true">G</span>;

function Brand() {
  return (
    <div className="stack sm">
      <div className="row-flex"><span className="au-logo">Logo</span><span className="t-title2">[App Name]</span></div>
      <p>Manage team projects with ease</p>
    </div>
  );
}

function SignIn() {
  return (
    <div className="stack">
      <h2 className="t-title3">Sign in to your account</h2>
      <Btn block icon={<G />} go="auth.account">Sign in with Google</Btn>
      <p className="t-footnote muted">No account yet? Just sign in with Google.<br />New accounts need admin approval before they can be used.</p>
    </div>
  );
}

const Footer = () => <p className="t-footnote muted center au-foot">Help · Privacy Policy</p>;

export function AuthLogin() {
  return (
    <Screen header={false} className="au-page">
      <Media label="Illustration / image" size="lg" />
      <Brand />
      <SignIn />
      <Footer />
    </Screen>
  );
}

export function AuthAccount() {
  return (
    <Screen header={<header className="au-google"><G big /><span className="t-headline">Sign in with Google</span></header>} className="au-page">
      <div className="stack xs">
        <h1 className="t-title2">Choose an account</h1>
        <p>to continue to [App Name]</p>
      </div>
      <Rows>
        <Row lead={<Avatar name="Budi" />} title="Budi Santoso" sub="budi@kantor.id" go="auth.pending" />
        <Row lead={<Avatar name="Budi" />} title="Budi Santoso" sub="budi.santoso@gmail.com" go="auth.denied" />
        <Row lead={<span className="au-other"><UserPlus size={20} /></span>} title="Use another account" toast="Opens Google sign-in" />
      </Rows>
      <p className="t-footnote muted">To continue, Google will share your name, email address, and profile photo with [App Name].</p>
      <p className="t-footnote muted au-foot au-links"><span className="spacer">English</span><span>Help</span><span>Privacy</span><span>Terms</span></p>
    </Screen>
  );
}

export function AuthDenied() {
  return (
    <Screen header={false} className="au-page">
      <Section className="au-alert">
        <div className="row-flex"><CircleAlert size={22} className="danger" aria-hidden="true" /><h1 className="t-title3">Access denied</h1></div>
        <div className="stack xs">
          <p className="t-footnote bold">Reason from admin:</p>
          <p className="t-subhead">Please sign in with your office email (@kantor.id), not a personal Gmail account. — Ayu</p>
        </div>
        <p className="t-footnote muted">This account was rejected / deactivated by an admin. You can still sign in with another Google account.</p>
      </Section>
      <Brand />
      <SignIn />
      <Footer />
    </Screen>
  );
}
