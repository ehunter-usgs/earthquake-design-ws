'use strict';


const NEHRP2020Factory = require('./nehrp-2020-factory'),
    NSHMHandler = require('../basis/nshm-handler'),
    extend = require('extend');


const _DEFAULTS = {
  factoryConstructor: NEHRP2020Factory,
  referenceDocument: 'NEHRP-2020'
};


/**
 * Handler for NEHRP2020Handler web service validates parameters and calls
 * factory with params.
 *
 * @param options {Object}
 *    Configuration options
 */
const NEHRP2020Handler = function (options) {
  let _this;


  options = extend({}, _DEFAULTS, options);
  _this = NSHMHandler(options);


  options = null;
  return _this;
};


module.exports = NEHRP2020Handler;
