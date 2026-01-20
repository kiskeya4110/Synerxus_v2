// Single source of truth for preapproved emails
// These emails bypass invitation codes AND get auto-approved organization status

export const PREAPPROVED_EMAILS = [
  // Organizations
  'idream@operationidream.org',
  'kmumba@operationidream.org',
  'asniabarazar07@gmail.com',
  'auldridgechibbwalu@yahoo.co.uk',
  'impactamexicoac@gmail.com',
  'info@impactamexico.org',
  'thinamaphosa@gmail.com',
  'brown.director@yestrust.org.zw',
  'susan.madodo@youngafrica.org',
  'josephine.millioni@youngafrica.org',
  'emezil97@gmail.com',
  'mabspro34@gmail.com',
  'mackenroodlacour@gmail.com',
  'limitlessfoundation633@gmail.com',
  // Pre-approved Volunteers
  'hpare79@gmail.com',
  'kamzizfr@gmail.com',
  'alraski@hotmail.com',
  'johnmarrely@gmail.com',
].map(email => email.toLowerCase());

export function isPreapprovedEmail(email: string): boolean {
  return PREAPPROVED_EMAILS.includes(email.toLowerCase());
}
