'use strict';

describe('Directive: drilldowngraph', function () {

  // load the directive's module
  beforeEach(module('nycCrashStatsApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<drilldowngraph></drilldowngraph>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the drilldowngraph directive');
  }));
});
