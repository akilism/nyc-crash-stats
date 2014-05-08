'use strict';

describe('Filter: dateDisplayFilter', function () {

  // load the filter's module
  beforeEach(module('nycCrashStatsApp'));

  // initialize a new instance of the filter before each test
  var dateDisplayFilter;
  beforeEach(inject(function ($filter) {
    dateDisplayFilter = $filter('dateDisplayFilter');
  }));

  it('should return the input prefixed with "dateDisplayFilter filter:"', function () {
    var text = 'angularjs';
    expect(dateDisplayFilter(text)).toBe('dateDisplayFilter filter: ' + text);
  });

});
