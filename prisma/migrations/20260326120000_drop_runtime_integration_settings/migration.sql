-- Legacy rows: source/destination types now come from VIBE_SQUIRE_SOURCE_TYPE / VIBE_SQUIRE_DESTINATION_TYPE env via AppEnv.
DELETE FROM "Setting" WHERE "key" IN ('source_type', 'destination_type');
