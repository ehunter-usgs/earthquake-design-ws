/* global afterEach, beforeEach, describe, it */
'use strict';


var expect = require('chai').expect,
    sinon = require('sinon'),
    WebService = require('../src/lib/web-service');


describe('WebService test suite', () => {
  describe('Constructor', () => {
    it('is defined', () => {
      expect(typeof WebService).to.equal('function');
    });
  });

  describe('destroy', () => {
    it('can be called', () => {
      expect(() => {
        var obj;

        obj = WebService();
        obj.destroy();
      }).to.not.throw(Error);
    });
  });

  describe('get', () => {
    var service;

    beforeEach(() => {
      service = WebService();
    });

    afterEach(() => {
      service.destroy();
      service = null;
    });

    it('calls next when no handler for method', () => {
      var next,
          request;

      next = sinon.spy();
      request = {
        params: {
          method: 'no such method'
        }
      };

      service.get(request, null, next);
      expect(next.calledOnce).to.equal(true);
    });

    it('creates handler and calls its get method', () => {
      var handler,
          request;

      handler = {
        get: sinon.stub().returns({
          then: function () {
            return this;
          },
          catch: function () {
            return this;
          }
        })
      };
      service.handlers['test handler'] = () => {
        return handler;
      };
      request = {
        params: {
          method: 'test handler'
        },
        query: {}
      };

      service.get(request, null, null);
      expect(handler.get.calledOnce).to.equal(true);
      expect(handler.get.calledWith(request.query)).to.equal(true);
    });

    it('calls onSuccess when handler promise resolves', (done) => {
      var args,
          data,
          handler,
          request;

      data = {};
      handler = {
        destroy: sinon.spy(),
        get: sinon.stub().returns(Promise.resolve(data))
      };
      service.handlers['test handler'] = () => {
        return handler;
      };
      request = {
        params: {
          method: 'test handler'
        },
        query: {}
      };

      sinon.stub(service, 'onSuccess', () => {
        expect(service.onSuccess.calledOnce).to.equal(true);
        args = service.onSuccess.getCall(0).args;
        expect(args[0]).to.equal(data);
        expect(args[1]).to.equal(request);
        service.onSuccess.restore();
        done();
      });
      service.get(request);
    });

    it('calls onError when handler promise rejects', (done) => {
      var args,
          err,
          handler,
          request;

      err = new Error('test error');
      handler = {
        destroy: sinon.spy(),
        get: sinon.stub().returns(Promise.reject(err))
      };
      service.handlers['test handler'] = () => {
        return handler;
      };
      request = {
        params: {
          method: 'test handler'
        },
        query: {}
      };

      sinon.stub(service, 'onError', () => {
        expect(service.onError.calledOnce).to.equal(true);
        args = service.onError.getCall(0).args;
        expect(args[0]).to.equal(err);
        expect(args[1]).to.equal(request);
        service.onError.restore();
        done();
      });
      service.get(request);
    });
  });

  describe('getResponseMetadata', () => {
    it('formats the metadata response', () => {
      var metadata,
          request,
          service;

      request = {
        hostname: 'hostname',
        originalUrl: '/url',
        protocol: 'protocol',
        query: {
          latitude: '40',
          longitude: '-105',
        }
      };

      service = WebService();
      metadata = service.getResponseMetadata(request, true);

      expect(metadata.status).to.equal('success');
      expect(metadata.url).to.equal('protocol://hostname/url');
      expect(metadata.parameters).to.equal(request.query);
    });
  });

  describe('onError', () => {
    it('calls response.status with 500 error code', () => {
      var response,
          service;

      response = {
        json: sinon.spy(),
        status: sinon.spy()
      };
      service = WebService();

      service.onError(null, {
        originalUrl: 'original url'
      }, response);
      expect(response.status.calledOnce).to.equal(true);
      expect(response.status.calledWith(500)).to.equal(true);

      service.destroy();
    });
  });

  describe('onSuccess', () => {
    it('calls next when data is null', () => {
      var next,
          service;

      next = sinon.spy();
      service = WebService();

      service.onSuccess(null, null, null, next);
      expect(next.calledOnce).to.equal(true);

      service.destroy();
    });

    it('calls response.json with data', () => {
      var data,
          request,
          response,
          service,
          stub;

      data = {};
      request = {
        originalUrl: 'test url'
      };
      response = {
        json: sinon.spy()
      };
      service = WebService();
      stub = sinon.stub(service, 'getResponseMetadata', () => { return ''; });

      service.onSuccess(data, request, response, null);
      expect(response.json.getCall(0).args[0].data).to.equal(data);
      expect(stub.getCall(0).args[0]).to.equal(request);

      service.destroy();
    });
  });

  describe('setHeaders', () => {
    it('sets headers on the response', () => {
      var response,
          service;

      response = {
        set: sinon.spy()
      };
      service = WebService();
      service.setHeaders(response);

      expect(response.set.callCount).to.equal(1);
      expect(typeof response.set.getCall(0).args[0]).to.equal('object');
    });
  });
});
