/** Volgo-merkteken: een zachte ronde vorm met een pijltje dat terugkomt (opvolgen). */
export function VolgoMark({ size = 26 }: { size?: number }) {
  return (
    <svg aria-hidden="true" className="v-mark" height={size} viewBox="0 0 32 32" width={size}>
      <rect className="v-mark__bg" height="32" rx="10" width="32" />
      <path className="v-mark__arc" d="M10 17.5a6.5 6.5 0 1 0 2.2-4.9" />
      <path className="v-mark__tip" d="M9.2 9.6l3 3-3.6 1.4" />
    </svg>
  );
}
