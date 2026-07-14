-- Add optional destination banner/cover image path.
ALTER TABLE public.destinations
ADD COLUMN IF NOT EXISTS cover_image_path text;
