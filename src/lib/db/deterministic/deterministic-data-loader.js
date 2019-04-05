'use strict';

const AbstractDataLoader = require('../abstract-data-loader'),
    Config = require('../../util/config'),
    extend = require('extend');

let config = Config().get(),
    documents = require('./documents.json'),
    regions = require('./regions.json');

const _DEFAULTS = {
  db: null,
  documents: documents,
  formats: [
    {
      dataColumns: ['latitude', 'longitude', 'pgad', 'sad'],
      csvColumns: [
        'LATITUDE',
        'LONGITUDE',
        'MAPPED_PGAD',
        'MAPPED_S1D',
        'MAPPED_SSD'
      ],
      saValues: ['MAPPED_SSD', 'MAPPED_S1D']
    }
  ],
  indexFile: __dirname + '/./index.sql',
  mode: AbstractDataLoader.MODE_MISSING,
  regions: regions,
  schemaFile: __dirname + '/./schema.sql',
  schemaName: config.DB_SCHEMA_DETERMINISTIC,
  schemaUser: config.DB_USER,
  dataLoadOpts: 'WITH CSV HEADER'
};

const DeterministicDataLoader = function(options) {
  let _this;

  options = extend({}, _DEFAULTS, options);
  _this = AbstractDataLoader(options);

  options = null;
  return _this;
};

module.exports = DeterministicDataLoader;
