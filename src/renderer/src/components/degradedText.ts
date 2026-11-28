/** The words of an agent's needs-a-fix notice (main's hive:degraded). The 0.5.8 usage data reasons have the window's
 *  own words in every language; any other reason shows main's text as it came. */
type T = (key: string) => string;

export function degradedText(t: T, reason: string | undefined, message: string): string {
  if (reason === 'telemetry-off') return t('usageNotice.telemetryOff');
  if (reason === 'engine-not-counted') return t('usageNotice.engineNotCounted');
  return message;
}
