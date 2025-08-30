CREATE TABLE IF NOT EXISTS metadata (
    type VARCHAR(100) NOT NULL,
    value INTEGER  NOT NULL,
    dateCreated VARCHAR(100) NOT NULL
);

-- DROP TABLE IF EXISTS projects;
-- DELETE FROM metadata WHERE type='db_version' AND value > 1;