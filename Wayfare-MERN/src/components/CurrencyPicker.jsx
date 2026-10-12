import { CURRENCIES } from "../lib/validation";
export default function CurrencyPicker({
  value,
  onChange,
  label = "Display currency",
  disabled = false,
}) {
  return (
    <label className="field currency-picker">
      {label}
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
export function RateNote({ conversion, base }) {
  return (
    <p className="meta" role="status">
      {conversion.error ||
        (conversion.loading
          ? "Loading exchange rate…"
          : conversion.quote?.rate !== 1
            ? `1 ${base} = ${conversion.quote.rate} ${conversion.display} · Rate dated ${conversion.quote.date}. Reference rates exclude bank fees.`
            : `Amounts in ${base}.`)}
    </p>
  );
}
