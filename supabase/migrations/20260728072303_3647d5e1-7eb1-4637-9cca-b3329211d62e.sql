ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS pickup_property_type text,
  ADD COLUMN IF NOT EXISTS delivery_property_type text,
  ADD COLUMN IF NOT EXISTS pickup_floor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_floor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_elevator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_elevator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_parking_distance text,
  ADD COLUMN IF NOT EXISTS delivery_parking_distance text,
  ADD COLUMN IF NOT EXISTS pickup_carry_distance text,
  ADD COLUMN IF NOT EXISTS delivery_carry_distance text,
  ADD COLUMN IF NOT EXISTS pickup_notes text,
  ADD COLUMN IF NOT EXISTS delivery_notes text;