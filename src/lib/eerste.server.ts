/** Invite for the first customers: free access for a limited time, handed out personally by the owner. Server only. */
const CODE = "BYINTENT1";
export const INVITE_DAGEN = 90;
export const inviteKlopt = (code: string) => code.trim().toUpperCase() === CODE;
