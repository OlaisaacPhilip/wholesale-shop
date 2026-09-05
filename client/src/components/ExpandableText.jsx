import { useState } from 'react';

export default function ExpandableText({ text, limit = 80 }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const isLong = text.length > limit;
  const displayText = expanded || !isLong ? text : text.slice(0, limit) + '...';

  return (
    <p className="description">
      <strong>Description: </strong>
      {displayText}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="see-more-btn"
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      )}
    </p>
  );
}