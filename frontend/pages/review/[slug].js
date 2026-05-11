
import { useState } from "react";

export default function ReviewFlow() {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState("");

  function handleSubmit() {
    if (rating <= 3) {
      const subject = encodeURIComponent("Internes Feedback");
      const body = encodeURIComponent(
        `Bewertung: ${rating} Sterne\n\nFeedback:\n${feedback}`
      );
      window.location.href = `mailto:feedback@mecklenburg-marketing.de?subject=${subject}&body=${body}`;
    } else {
      window.location.href = "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4";
    }
    setSubmitted(true);
  }

  return (
    <main className="reviewPage">
      <div className="reviewCard">
        <div className="reviewLogo">★</div>

        <h1>Wie war dein Besuch?</h1>
        <p>
          Deine Meinung hilft uns dabei, unseren Service weiter zu verbessern.
        </p>

        <div className="starRow">
          {[1,2,3,4,5].map((n) => (
            <button
              key={n}
              className={n <= rating ? "star active" : "star"}
              onClick={() => setRating(n)}
            >
              ★
            </button>
          ))}
        </div>

        {rating > 0 && rating <= 3 && (
          <textarea
            className="reviewInput"
            placeholder="Was können wir verbessern?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        )}

        {rating > 3 && (
          <div className="goodReview">
            Vielen Dank! Du wirst nun zu Google weitergeleitet.
          </div>
        )}

        {rating > 0 && (
          <button className="reviewButton" onClick={handleSubmit}>
            Bewertung absenden
          </button>
        )}

        {submitted && (
          <div className="successBox">
            Vielen Dank für dein Feedback!
          </div>
        )}
      </div>
    </main>
  );
}
