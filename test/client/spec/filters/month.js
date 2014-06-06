'use strict';

describe('Filter: month', function () {

  // load the filter's module
  beforeEach(module('nycCrashStatsApp'));

  // initialize a new instance of the filter before each test
  var month;
  beforeEach(inject(function ($filter) {
    month = $filter('month');
  }));

  it('should return the input prefixed with "month filter:"', function () {
    var text = 'angularjs';
    expect(month(text)).toBe('month filter: ' + text);
  });

});
