/**
 * Cinq etoiles pleines ou vides, jamais de demie : la note est un entier de 1
 * a 5 cote base. Purement decoratif — la valeur est deja ecrite a cote en
 * clair, d'ou l'`aria-hidden`.
 */
export function Stars({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <span aria-hidden className={`text-star tracking-[0.05em] ${className}`}>
      {"★".repeat(value)}
      <span className="text-line-strong">{"★".repeat(5 - value)}</span>
    </span>
  );
}
