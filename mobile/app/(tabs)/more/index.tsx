import { Redirect } from 'expo-router';

/** More has no screen of its own (its tab unfolds the More panel); a link to /more lands on Home. */
export default function MoreIndex() {
  return <Redirect href="/" />;
}
