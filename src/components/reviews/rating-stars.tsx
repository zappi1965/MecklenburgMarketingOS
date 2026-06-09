export function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} von 5 Sternen`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= rating ? "text-yellow-400" : "text-muted-foreground/30"}
        >
          ★
        </span>
      ))}
    </span>
  );
}
