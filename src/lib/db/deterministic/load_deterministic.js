'use strict';

const Config = require('../../util/config'),
    copyFrom = require('pg-copy-streams').from,
    dbUtils = require('../db-utils'),
    UrlStream = require('../../util/url-stream'),
    zlib = require('zlib');


// variables/data
let config = Config().get(),
    documents = require('./documents.json'),
    regions = require('./regions.json');


const DeterministicDataLoader = function(_db) {
  let _this;

  _this = {};
  _this.db = _db;
  _this.regionIds = [];

  /**
   * Create database schema.
   *
   * Based on config.DB_SCHEMA_DETERMINISTIC.
   *
   * @return {Promise}
   *     promise representing schema has been created.
   */
  _this.createSchema = ((dropSchema) => {
    let schemaName,
        schemaUser;

    process.stdout.write('\nCreate Schema: ' + dropSchema);

    schemaName = config.DB_SCHEMA_DETERMINISTIC;
    schemaUser = config.DB_USER;
    if (!schemaName || !schemaUser) {
      throw new Error('deterministic schema name not configured');
    }

    if (dropSchema) {
      return dbUtils.createSchema({
        db: _this.db,
        file: __dirname + '/./schema.sql',
        name: config.DB_SCHEMA_DETERMINISTIC,
        user: config.DB_USER
      });
    } else {
      return _this.db.query('SET search_path TO '
        + config.DB_SCHEMA_DETERMINISTIC);
    }
  });


  /**
   * Insert region metadata.
   *
   * @return {Promise<Array<String, Int>>}
   *     resolves to mapping from region name to region id.
   */
  _this.insertRegions = (() => {
    let promise,
        regionIds;

    process.stdout.write('\nInsert Regions');

    // load regions
    promise = Promise.resolve();
    regionIds = {};
    regions.forEach((region) => {
      promise = promise.then(() => {
        return _this.db.query(`
          INSERT INTO region (
            name,
            grid_spacing,
            max_latitude,
            max_longitude,
            min_latitude,
            min_longitude
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (name) DO UPDATE SET NAME = ($1)
          RETURNING id
        `, [
          region.name,
          region.grid_spacing,
          region.max_latitude,
          region.max_longitude,
          region.min_latitude,
          region.min_longitude
        ]).then((result) => {
          // save region id for later data loading
          regionIds[region.name] = result.rows[0].id;
        });
      });
    });

    return promise.then(() => {
      // all regions inserted, and IDs should be set
      return regionIds;
    });
  });


  /**
   * Insert document metadata.
   *
   * @return {Promise}
   *     promise representing document metadata being inserted.
   */
  _this.insertDocuments = (() => {
    return _this.insertRegions().then((regionIds) => {
      _this.regionIds = regionIds;
      process.stdout.write('\nInsert Documents');

      let promise = Promise.resolve();
      documents.forEach((doc) => {
        doc.regions.forEach((region) => {
          var regionId;

          if (!regionIds.hasOwnProperty(region)) {
            throw new Error('Region "' + region + '" not found' +
                ', inserting document ' + doc.name);
          }
          regionId = regionIds[region];

          promise = promise.then(() => {

            process.stdout.write('\nInserting ' + regionId + ' Document '
              + doc.name);

            _this.db.query(`
              INSERT INTO document (
                region_id,
                name
              ) VALUES ($1, $2)
              ON CONFLICT (region_id, name) DO NOTHING
            `, [
              regionId,
              doc.name
            ]);
          }).catch((e) => {
            process.stderr.write('\n\n*** Error: ' + e.message);
          });
        });
      });
      return promise;
    });
  });


  /**
   * Insert region data.
   *
   * @return {Promise}
   *     promise representing that all region data has been inserted.
   */
  _this.insertData = (() => {
    return _this.insertDocuments().then(() => {
      let promise;

      process.stdout.write('\nInsert Data');

      promise = Promise.resolve();

      regions.forEach((region) => {
        // run each region load in sequence
        promise = promise.then(() => {

          process.stdout.write('\nLoading ' + region.name + ' region data');

          return _this.db.query('DROP TABLE IF EXISTS temp_region_data CASCADE').then(() => {
            // create temporary table for loading data
            return _this.db.query(`
              CREATE TABLE temp_region_data (
                latitude NUMERIC NOT NULL,
                longitude NUMERIC NOT NULL,
                pgad NUMERIC DEFAULT NULL,
                s1d NUMERIC DEFAULT NULL,
                ssd NUMERIC DEFAULT NULL
              )
            `);
          }).then(() => {
            // use copy from to read data
            return new Promise((resolve, reject) => {
              var data,
                  doReject,
                  doResolve,
                  stream;

              data = UrlStream({
                url: region.url
              });

              stream = _this.db.query(copyFrom(`
                  COPY temp_region_data
                  (latitude, longitude, pgad, s1d, ssd)
                  FROM STDIN
                  WITH CSV HEADER
              `));

              doReject = (err) => {
                data.destroy();
                reject(err);
              };

              doResolve = () => {
                data.destroy();
                resolve();
              };

              data.on('error', doReject);
              stream.on('error', doReject);
              stream.on('end', doResolve);
              data.pipe(zlib.createGunzip()).pipe(stream);
            });
          }).then(() => {
            // transfer data into actual table
            return _this.db.query(`
              INSERT INTO data (
                region_id,
                latitude,
                longitude,
                pgad,
                s1d,
                ssd
              ) (
                SELECT
                  $1,
                  latitude,
                  longitude,
                  pgad,
                  s1d,
                  ssd
                  FROM temp_region_data
              )
              ON CONFLICT (region_id, latitude, longitude, pgad,
              s1d, ssd) DO NOTHING
            `, [_this.regionIds[region.name]]);
          }).then(() => {
            // remove temporary table
            return _this.db.query('DROP TABLE temp_region_data CASCADE');
          });
        });
      });

      return promise;

    });
  });

  _this.loadMissingData = (() => {
    return _this.db.query('DROP INDEX IF EXISTS region__bounds_idx;' +
      'DROP INDEX IF EXISTS data__regionid_latitude_longitude_idx;' +
      'DROP INDEX IF EXISTS document__regionid_name_idx;').then(() => {
        return Promise.all([_this.insertData()]).then(() => {
          return dbUtils.readSqlFile(__dirname
            + '/./index.sql').then((statements) => {
              return dbUtils.exec(_this.db, statements);
            });
        }).catch((e) => {
          process.stdout.write('\nERROR: ' + e.message);
        });
      });
  });

  _this.createIndexes = (() => {
    return Promise.all([_this.insertData()]).then(() => {
      return dbUtils.readSqlFile(__dirname
        + '/./index.sql').then((statements) => {
          return dbUtils.exec(_this.db, statements);
        });
    }).catch((e) => {
      process.stdout.write('\nERROR: ' + e.message);
    });
  });

  _this.closeDBConnection = (() => {
    return new Promise((resolve, reject) => {
      _this.db.end((error) => {
        if (error) {
          reject(error);
        } else {
          resolve(null);
        }
      });
    });
  });
  return _this;
};


module.exports = DeterministicDataLoader;