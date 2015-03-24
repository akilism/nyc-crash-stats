'use strict';

filters.filter('statName', function () {
    return function (input) {
      var re = /\//g;
      return (input) ? input.replace(re, ' / ').toLowerCase() : 'Blank';
    };
  });
