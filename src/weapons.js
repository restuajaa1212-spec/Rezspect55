// Data senjata. Index 0 = tinju. mag = isi magasin, cd = jeda tembak (detik), kick = hentakan bidik.
export const WEAPONS = [
  { n: 'Tinju', icon: '👊', melee: true },
  { n: 'Pistol', icon: '🔫', mag: 12, dmg: 20, cd: .25, auto: false, spread: 0, pellets: 1, reload: 1.2, range: 70, kick: .012 },
  { n: 'SMG', icon: '⚡', mag: 30, dmg: 12, cd: .09, auto: true, spread: .03, pellets: 1, reload: 1.6, range: 60, kick: .008 },
  { n: 'Shotgun', icon: '💥', mag: 6, dmg: 12, cd: .9, auto: false, spread: .06, pellets: 8, reload: 2, range: 30, kick: .05 },
  { n: 'Senapan', icon: '🎯', mag: 30, dmg: 22, cd: .14, auto: true, spread: .015, pellets: 1, reload: 1.8, range: 110, kick: .01 },
  { n: 'Sniper', icon: '🔭', mag: 5, dmg: 70, cd: 1.1, auto: false, spread: 0, pellets: 1, reload: 2.2, range: 200, kick: .06, zoom: true },
];
