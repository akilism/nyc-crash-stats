'use strict';

describe('Filter: keyFilter', function () {

  // load the filter's module
  beforeEach(module('nycCrashStatsApp'));

  // initialize a new instance of the filter before each test
  var keyFilter;
  beforeEach(inject(function ($filter) {
    keyFilter = $filter('keyFilter');
  }));

  it('should return the input prefixed with "keyFilter filter:"', function () {
    var text = 'angularjs';
    expect(keyFilter(text)).toBe('keyFilter filter: ' + text);
  });

});
