
-- ROOMIE TRANSFER V2
-- DEVELOPMENT ONLY — DO NOT RUN IN PRODUCTION
-- Creates separate transfer functions.
-- Does not replace the existing Roomie transfer system.

BEGIN;

CREATE TABLE IF NOT EXISTS public.transfers_v2 (
  id text PRIMARY KEY,
  blob text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roomie_transfer_v2_id_format
    CHECK (id ~ '^[A-Za-z0-9_-]{22}$'),
  CONSTRAINT roomie_transfer_v2_blob_size
    CHECK (length(blob) BETWEEN 30 AND 4000000),
  CONSTRAINT roomie_transfer_v2_blob_prefix
    CHECK (blob LIKE 'v2.%')
);

ALTER TABLE public.transfers_v2
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.transfers_v2
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.put_transfer_v2(
  p_id text, p_blob text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF p_id IS NULL
    OR p_id !~ '^[A-Za-z0-9_-]{22}$'
    OR p_blob IS NULL
    OR length(p_blob) NOT BETWEEN 30 AND 4000000
    OR p_blob NOT LIKE 'v2.%'
  THEN
    RETURN false;
  END IF;

  DELETE FROM public.transfers_v2
  WHERE created_at < now() - interval '30 minutes';

  INSERT INTO public.transfers_v2(id, blob)
  VALUES (p_id, p_blob);

  RETURN true;

EXCEPTION
  WHEN unique_violation OR check_violation THEN
    RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.take_transfer_v2(
  p_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  b text;
BEGIN
  IF p_id IS NULL
    OR p_id !~ '^[A-Za-z0-9_-]{22}$'
  THEN
    RETURN NULL;
  END IF;

  DELETE FROM public.transfers_v2
  WHERE id = p_id
    AND created_at > now() - interval '30 minutes'
  RETURNING blob INTO b;

  RETURN b;
END;
$function$;

REVOKE ALL ON FUNCTION public.put_transfer_v2(text,text)
  FROM PUBLIC, authenticated;

REVOKE ALL ON FUNCTION public.take_transfer_v2(text)
  FROM PUBLIC, authenticated;

GRANT EXECUTE ON FUNCTION public.put_transfer_v2(text,text)
  TO anon;

GRANT EXECUTE ON FUNCTION public.take_transfer_v2(text)
  TO anon;

COMMIT;
