CREATE TABLE region (
  id SERIAL NOT NULL PRIMARY KEY,

  grid_spacing NUMERIC NOT NULL,
  max_latitude NUMERIC NOT NULL,
  max_longitude NUMERIC NOT NULL,
  min_latitude NUMERIC NOT NULL,
  min_longitude NUMERIC NOT NULL,
  name VARCHAR(255) NOT NULL UNIQUE,
  periods NUMERIC ARRAY NOT NULL,
  vs30 NUMERIC NOT NULL
);

CREATE TABLE document (
  id SERIAL NOT NULL PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES region(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  UNIQUE (region_id, name)
);

CREATE TABLE metadata (
  id SERIAL NOT NULL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES document(id) ON DELETE CASCADE,

  sadFloor NUMERIC ARRAY DEFAULT NULL,
  saMaxDirectionFactor NUMERIC ARRAY DEFAULT NULL,
  sadPercentileFactor NUMERIC ARRAY DEFAULT NULL,
  curveInterpolationMethod VARCHAR(255) DEFAULT NULL,
  spatialInterpolationMethod VARCHAR(255) NOT NULL,
  modelVersion VARCHAR(255) NOT NULL,
  pgadFloor NUMERIC DEFAULT NULL,
  pgadPercentileFactor NUMERIC DEFAULT NULL
);
