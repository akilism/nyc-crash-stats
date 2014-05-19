'use strict';

describe('Service: Geodata', function () {

  // load the service's module
  beforeEach(module('nycCrashStatsApp'));

  // instantiate service
  var Geodata;
  beforeEach(inject(function (_Geodata_) {
    Geodata = _Geodata_;
  }));

  it('should do something', function () {
    expect(!!Geodata).toBe(true);
  });

});
