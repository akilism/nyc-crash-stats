'use strict';

describe('Service: Socrata', function () {

  // load the service's module
  beforeEach(module('nycCrashStatsApp'));

  // instantiate service
  var Socrata;
  beforeEach(inject(function (_Socrata_) {
    Socrata = _Socrata_;
  }));

  it('should do something', function () {
    expect(!!Socrata).toBe(true);
  });

});
