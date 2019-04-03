'use strict';

const NSHM2014Factory = require('../basis/nshm_2014-factory'),
    extend = require('extend');

const _DEFAULTS = {
  referenceDocument: 'NEHRP-2020'
};

/**
 * Class: NEHRP2020Factory
 *
 * @param options Object
 *      Configuration options for this instance
 */
const NEHRP2020Factory = function(options) {
  let _this;

  options = extend({}, _DEFAULTS, options);
  _this = NSHM2014Factory(options);

  options = null;
  return _this;
};

module.exports = NEHRP2020Factory;
