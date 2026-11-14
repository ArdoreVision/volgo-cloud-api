// The Volgo plugin for WordPress, made on the spot for one business: its code is already inside, so the owner
// only uploads and activates. No key to copy, no code to paste.

/** The plugin file. `sleutel` and `origin` are checked by the caller; they are still escaped again in PHP. */
export function pluginPhp(origin: string, sleutel: string) {
  return `<?php
/**
 * Plugin Name: Volgo
 * Plugin URI: https://thevolgo.app
 * Description: Adds the Volgo chat to your website, so visitors can book an appointment themselves. Your Volgo code is already filled in.
 * Version: 1.0.0
 * Author: Volgo
 * Author URI: https://thevolgo.app
 * License: GPLv2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

define('VOLGO_SRC', '${origin}/ava.js');
define('VOLGO_KEY', '${sleutel}');

// One line at the end of every public page. Nothing is stored in WordPress and nothing else is changed:
// switching the plugin off removes Volgo from the website again.
add_action('wp_footer', function () {
    printf('<script src="%s" data-key="%s" defer></script>' . "\\n", esc_url(VOLGO_SRC), esc_attr(VOLGO_KEY));
}, 99);
`;
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A zip with the given files, stored without compression (the files are tiny). Enough for WordPress's uploader. */
export function maakZip(bestanden: { pad: string; inhoud: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const delen: Uint8Array[] = [];
  const centraal: Uint8Array[] = [];
  let offset = 0;
  // Fixed date (1 Jan 2026, 00:00): the zip is the same every time for the same business.
  const tijd = 0;
  const datum = ((2026 - 1980) << 9) | (1 << 5) | 1;
  for (const f of bestanden) {
    const naam = enc.encode(f.pad);
    const data = enc.encode(f.inhoud);
    const crc = crc32(data);
    const kop = new DataView(new ArrayBuffer(30));
    kop.setUint32(0, 0x04034b50, true);
    kop.setUint16(4, 20, true); // version needed
    kop.setUint16(6, 0x0800, true); // names are UTF-8
    kop.setUint16(8, 0, true); // stored
    kop.setUint16(10, tijd, true);
    kop.setUint16(12, datum, true);
    kop.setUint32(14, crc, true);
    kop.setUint32(18, data.length, true);
    kop.setUint32(22, data.length, true);
    kop.setUint16(26, naam.length, true);
    kop.setUint16(28, 0, true);
    delen.push(new Uint8Array(kop.buffer), naam, data);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true); // made by
    c.setUint16(6, 20, true); // version needed
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, tijd, true);
    c.setUint16(14, datum, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, naam.length, true);
    c.setUint32(42, offset, true);
    centraal.push(new Uint8Array(c.buffer), naam);
    offset += 30 + naam.length + data.length;
  }
  const centraalLen = centraal.reduce((n, d) => n + d.length, 0);
  const eind = new DataView(new ArrayBuffer(22));
  eind.setUint32(0, 0x06054b50, true);
  eind.setUint16(8, bestanden.length, true);
  eind.setUint16(10, bestanden.length, true);
  eind.setUint32(12, centraalLen, true);
  eind.setUint32(16, offset, true);
  const alles = [...delen, ...centraal, new Uint8Array(eind.buffer)];
  const uit = new Uint8Array(alles.reduce((n, d) => n + d.length, 0));
  let o = 0;
  for (const d of alles) {
    uit.set(d, o);
    o += d.length;
  }
  return uit;
}

/** volgo.zip for one business. Returns null when the code or address is not something safe to put in a file. */
export function volgoPluginZip(origin: string, sleutel: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(sleutel)) return null;
  if (!/^https:\/\/[a-z0-9.-]+$/.test(origin)) return null;
  return maakZip([{ pad: "volgo/volgo.php", inhoud: pluginPhp(origin, sleutel) }]);
}
