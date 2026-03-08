/**
 * Money helpers — ALL money as BIGINT paise (×100). Never float.
 * @see ARCHITECTURE.md
 */

export function paise(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

export function formatINR(paise: bigint): string {
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(rupees);
}
