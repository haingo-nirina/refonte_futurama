"use client";

const RATINGS = [1, 2, 3, 4, 5];

/** Selecteur de note, partage par le depot et la modification d'un avis. */
export function RatingPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-ink/80 mr-1.5 text-[12.5px]">Note</span>
      {RATINGS.map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onChange(rating)}
          aria-label={`Noter ${rating} sur 5`}
          aria-pressed={value === rating}
          className={`text-[20px] leading-none transition disabled:opacity-50 ${
            rating <= value ? "text-star" : "text-line-strong"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
