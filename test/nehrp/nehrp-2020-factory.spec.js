/* global describe, it */
'use strict';

const NEHRP2020Factory = require('../../src/lib/nehrp/nehrp-2020-factory'),
    expect = require('chai').expect;

describe('nehrp-2020-factory', () => {
  describe('constructor', () => {
    it('is defined', () => {
      expect(typeof NEHRP2020Factory).to.not.equal('undefined');
    });

    it('can be instantiated', () => {
      expect(NEHRP2020Factory).to.not.throw(Error);
    });

    it('can be destroyed', () => {

      const factory = NEHRP2020Factory();
      expect(factory.destroy).to.not.throw(Error);
      factory.destroy();
    });
  });
});
