'use strict';

describe('Directive: factorGraph', function () {

  // load the directive's module
  beforeEach(module('nycCrashStatsApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<factor-graph></factor-graph>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the factorGraph directive');
  }));
});
