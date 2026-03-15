-- Add confidence score and metadata to biases table
ALTER TABLE biases ADD COLUMN IF NOT EXISTS confidence INTEGER;
ALTER TABLE biases ADD COLUMN IF NOT EXISTS confidence_rationale TEXT;

-- confidence: 1-100 integer score
-- confidence_rationale: brief explanation of why confidence is high/low
