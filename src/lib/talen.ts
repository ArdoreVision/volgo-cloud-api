// Languages the website can be shown in: every official EU language.
export const TALEN: { code: string; naam: string; engels: string }[] = [
  { code: "en", naam: "English", engels: "English" },
  { code: "nl", naam: "Nederlands", engels: "Dutch" },
  { code: "de", naam: "Deutsch", engels: "German" },
  { code: "fr", naam: "Français", engels: "French" },
  { code: "es", naam: "Español", engels: "Spanish" },
  { code: "pt", naam: "Português", engels: "Portuguese" },
  { code: "it", naam: "Italiano", engels: "Italian" },
  { code: "pl", naam: "Polski", engels: "Polish" },
  { code: "sv", naam: "Svenska", engels: "Swedish" },
  { code: "da", naam: "Dansk", engels: "Danish" },
  { code: "fi", naam: "Suomi", engels: "Finnish" },
  { code: "el", naam: "Ελληνικά", engels: "Greek" },
  { code: "cs", naam: "Čeština", engels: "Czech" },
  { code: "sk", naam: "Slovenčina", engels: "Slovak" },
  { code: "hu", naam: "Magyar", engels: "Hungarian" },
  { code: "ro", naam: "Română", engels: "Romanian" },
  { code: "bg", naam: "Български", engels: "Bulgarian" },
  { code: "hr", naam: "Hrvatski", engels: "Croatian" },
  { code: "sl", naam: "Slovenščina", engels: "Slovenian" },
  { code: "et", naam: "Eesti", engels: "Estonian" },
  { code: "lv", naam: "Latviešu", engels: "Latvian" },
  { code: "lt", naam: "Lietuvių", engels: "Lithuanian" },
  { code: "ga", naam: "Gaeilge", engels: "Irish" },
  { code: "mt", naam: "Malti", engels: "Maltese" },
];
export const TAAL_CODES = TALEN.map((t) => t.code);
export const isTaal = (c: string): boolean => TAAL_CODES.includes(c);
