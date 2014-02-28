/* jshint expr: true */

var expect = chai.expect;

describe('Test', function () {

  before(function () {
    cohorts.Options.debug = true;
  });

  beforeEach(function () {
    helpers.clearCookies();
  });

  after(function () {
    helpers.clearCookies();
  });

  describe('new()', function () {

    it('should throw an error if a name isn\'t supplied', function () {
      expect(function() {
        new cohorts.Test();
      }).to.throw;
    });

    it('should throw an error if sections aren\'t supplied', function () {
      expect(function() {
        new cohorts.Test({ name: 'test' });
      }).to.throw;
    });

    it('should add the new test to the tests map', function () {
      var test = new cohorts.Test({
        name: 'test',
        sections: { main: { a: {} } }
      });

      expect(test).to.deep.equal(cohorts.tests['test']);
    });

  });

  describe('run()', function () {

    it('should put you in a test', function () {
      var test = new cohorts.Test({
        name: 'test',
        sections: { main: { a: {} } }
      });

      expect(cohorts.Cookies.get('_cohort_test')).to.equal('main:a');
    });

    it('should not put you in a cohort if you\'re already in one', function () {
      new cohorts.Test({
        name: 'test',
        sections: { main: { a: {} } }
      });

      expect(cohorts.Cookies.get('_cohort_test')).to.equal('main:a');

      new cohorts.Test({
        name: 'test',
        sections: { main: { b: {} } }
      });

      expect(cohorts.Cookies.get('_cohort_test')).to.equal('main:a');
    });

    it('should fire onChosen callback when a variation is chosen', function (done) {
      var onChosen = function () {
        expect(cohorts.Cookies.get('_cohort_test')).to.equal('main:a');
        done();
      };

      new cohorts.Test({
        name: 'test',
        sections: { main: { a: { onChosen: onChosen } } }
      });
    });

    it('should correctly choose the variation', function () {
      var random = sinon.stub(Math, 'random');

      var def = {
        name: 'test',
        sections: { main: { a: {}, b: {}, c: {} } }
      };

      random.returns(0.1);
      new cohorts.Test(def);
      expect(cohorts.Cookies.get('_cohort_test')).to.equal('main:a');
      helpers.clearCookies();

      random.returns(0.4);
      new cohorts.Test(def);
      expect(cohorts.Cookies.get('_cohort_test')).to.equal('main:b');
      helpers.clearCookies();

      random.returns(0.7);
      new cohorts.Test(def);
      expect(cohorts.Cookies.get('_cohort_test')).to.equal('main:c');
    });

  });

});
