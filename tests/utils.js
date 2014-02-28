/* jshint expr: true */

var expect = chai.expect;

describe('Utils', function () {

  var utils = cohorts.Utils;

  describe('extend()', function () {
    var a, b;

    before(function () {
      a = { foo: 'bar' };
      b = { foo: 'baz', boom: 'boosh' };
      utils.extend(a, b);
    });

    it('should merge keys', function () {
      expect(Object.keys(a)).to.deep.equal(['foo', 'boom']);
    });

    it('should overwrite destination with source', function () {
      expect(a.foo).to.equal('baz');
    });

    it('should add new values from source', function () {
      expect(a.boom).to.equal('boosh');
    });

  });

  describe('size()', function () {

    it('should correctly return the number of keys on the object', function () {
      expect(utils.size({ foo: true, bar: true })).to.equal(2);
    });

  });

  describe('keys()', function () {

    it('should return the object\'s keys', function () {
      expect(utils.keys({ foo: true, bar: true })).to.deep.equal(['foo', 'bar']);
    });

  });

  describe('log()', function () {

    beforeEach(function () {
      sinon.spy(console, 'log');
    });

    afterEach(function () {
      console.log.restore();
    });

    it('should log a message to the console if debug is enabled', function () {
      cohorts.Options.debug = true;
      utils.log('test');
      expect(console.log.calledOnce).to.be.true;
      expect(console.log.calledWith('test')).to.be.true;
    });

    it('should not log a message to the console if debug is disabled', function () {
      cohorts.Options.debug = false;
      utils.log('test');
      expect(console.log.callCount).to.equal(0);
    });

  });

});
