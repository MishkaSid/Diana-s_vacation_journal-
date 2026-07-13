-- Ensure deleting a destination removes its photo rows.
ALTER TABLE public.photos
DROP CONSTRAINT IF EXISTS photos_destination_id_fkey;

ALTER TABLE public.photos
ADD CONSTRAINT photos_destination_id_fkey
FOREIGN KEY (destination_id)
REFERENCES public.destinations(id)
ON DELETE CASCADE;
