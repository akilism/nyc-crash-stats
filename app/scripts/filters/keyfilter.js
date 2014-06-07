'use strict';

filters.filter('keyFilter', function () {
    return function (input) {
      var re = /_/g;
      if (input === 'total_accidents') { return 'total crashes'; }
      return input.replace('number_of', '').replace(re, ' ');
    };
  });
