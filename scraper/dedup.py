"""
Headline deduplication using token overlap.
Threshold: 90%+ token similarity = duplicate.
"""

import re

# Words too common to be meaningful in financial headlines
STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "and", "but", "or", "nor", "not", "so", "yet",
    "both", "either", "neither", "each", "every", "all", "any", "few",
    "more", "most", "other", "some", "such", "no", "only", "own", "same",
    "than", "too", "very", "just", "because", "if", "when", "while",
    "that", "this", "these", "those", "it", "its", "per", "via", "says",
    "said", "according", "report", "reports", "breaking", "update",
}


def tokenize(headline: str) -> set[str]:
    """Extract meaningful tokens from a headline."""
    # Remove punctuation, lowercase, split
    cleaned = re.sub(r"[^\w\s]", "", headline.lower())
    words = cleaned.split()
    # Remove stop words and single chars
    return {w for w in words if w not in STOP_WORDS and len(w) > 1}


def token_overlap(tokens_a: set[str], tokens_b: set[str]) -> float:
    """Calculate overlap ratio between two token sets."""
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    # Use the average of both set sizes as denominator so that a short
    # headline fully contained in a much longer one scores below threshold
    avg = (len(tokens_a) + len(tokens_b)) / 2
    return len(intersection) / avg if avg > 0 else 0.0


def is_duplicate_headline(
    new_headline: str,
    existing_headlines: list[str],
    threshold: float = 0.90,
) -> bool:
    """
    Check if a headline is a duplicate of any existing headlines.
    Uses 90% token overlap threshold.
    """
    new_tokens = tokenize(new_headline)
    if not new_tokens:
        return False

    for existing in existing_headlines:
        existing_tokens = tokenize(existing)
        if token_overlap(new_tokens, existing_tokens) >= threshold:
            return True

    return False
