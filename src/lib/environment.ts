export function isTestHost(host: string | null | undefined): boolean {
  return (host ?? '').split(':', 1)[0].toLowerCase() === 'fond-test.mid-point.co.za';
}

export function publicAppName(host: string | null | undefined): string {
  return isTestHost(host) ? 'FOND Midpoint TEST' : 'FOND Midpoint';
}

export function staffAppName(host: string | null | undefined): string {
  return isTestHost(host) ? 'FOND Staff TEST' : 'FOND Staff';
}
