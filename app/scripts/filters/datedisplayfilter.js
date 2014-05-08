'use strict';

filters.filter('dateDisplayFilter', function () {
    return function (input) {
      //TODO Reformat into pretty date Month Day, Year
      return input.slice(0, input.indexOf('T'));
    };
  });
