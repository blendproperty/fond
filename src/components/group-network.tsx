import styles from './group-network.module.css';

const links = [
  ['Midpoint estate', 'https://www.mid-point.co.za/'],
  ['Blend Property Group', 'https://www.blendproperty.co.za/'],
  ['STOR24 storage', 'https://stor24.co.za/'],
  ['OnPoint offices', 'https://onpointoffices.co.za/'],
  ['Property listings', 'https://listings.blendproperty.co.za/'],
] as const;

export function GroupNetwork() {
  return <nav className={styles.root} aria-label="Explore the Midpoint network">
    <p className={styles.heading}>Explore the Midpoint network</p>
    <div className={styles.links}>{links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</div>
  </nav>;
}
