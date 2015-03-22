'use strict';

filters.filter('factorname', function () {
    return function (input) {
      return (input) ? input : 'Blank';
    };
  });

// statname.
// k.replace(re, ' / ').toLowerCase()
