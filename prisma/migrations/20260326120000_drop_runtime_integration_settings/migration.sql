-- Legacy rows: source/destination types now come from SOURCE_TYPE / DESTINATION_TYPE env via AppEnv.
DELETE FROM "Setting" WHERE "key" IN ('source_type', 'destination_type');
