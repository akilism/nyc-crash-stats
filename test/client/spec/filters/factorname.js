'use strict';

describe('Filter: factorname', function () {

  // load the filter's module
  beforeEach(module('nycCrashStatsApp'));

  // initialize a new instance of the filter before each test
  var factorname;
  beforeEach(inject(function ($filter) {
    factorname = $filter('factorname');
  }));

  it('should return the input prefixed with "factorname filter:"', function () {
    var text = 'angularjs';
    expect(factorname(text)).toBe('factorname filter: ' + text);
  });

});
