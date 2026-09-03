-- Adds a photo_url column to events so sub-events (and main events) can attach a reference photo.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS photo_url text;
