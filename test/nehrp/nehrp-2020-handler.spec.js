/* global describe, it */
'use strict';


const DesignHandler = require('../../src/lib/nehrp/nehrp-2020-handler'),
    expect = require('chai').expect;


describe('nehrp-2020-handler', () => {
  describe('constructor', () => {
    it('is defined', () => {
      expect(typeof DesignHandler).to.equal('function');
    });

    it('can be instantiated', () => {
      expect(DesignHandler).to.not.throw(Error);
    });
  });
});
