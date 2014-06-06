'use strict';

filters.filter('dateDisplayFilter', function () {
    return function (input) {

      //TODO Reformat into pretty date Month Day, Year
      if(input) {
        var d = new Date(input);
        return d.toDateString();
      }

      return input;
    };
  });
