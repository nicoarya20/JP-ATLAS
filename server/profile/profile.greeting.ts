/** The name the Beranda greeting uses: the nickname, else the first word of the display/account name. */
export function greetingName(p: {
  nickname: string | null;
  displayName: string | null;
  name: string;
}): string {
  const nick = p.nickname?.trim();
  if (nick) return nick;
  const full = (p.displayName?.trim() || p.name.trim()).split(/\s+/)[0];
  return full || 'pengguna';
}
