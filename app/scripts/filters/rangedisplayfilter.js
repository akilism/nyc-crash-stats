'use strict';

filters.filter('rangeDisplayFilter', function () {
    return function (input) {

      //TODO Reformat into pretty date Month Day, Year
      if(input && input.hasOwnProperty('min')) {
        var dayMin, monthMin, dayMax, monthMax;
        dayMin = input.min.getDate();
        monthMin = input.min.getMonth() + 1;
        dayMax = input.max.getDate();
        monthMax = input.max.getMonth() + 1;
        return '(' + monthMin + '/' + dayMin + ' - ' + monthMax + '/' + dayMax + ')';
      } else { return ''; }

    };
  });
