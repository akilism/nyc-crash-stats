'use strict';

directives.directive('header', ['$location', function ($location) {
    return {
      templateUrl: 'partials/header.html',
      restrict: 'E',
      scope: {},
      link: function postLink(scope, element, attrs) {
        scope.showJumbo = function () {
          $('.jumbotron-wrapper').fadeIn();
          ga('send', 'event', 'click', 'about');
        };

        scope.hideJumbo = function () {
          $('.jumbotron-wrapper').fadeOut();
        };

        scope.trackView = function () {
          ga('send', 'event', 'click', 'view detail pages');
        };

        if($location.path() !== '/') {
          $('.view-detail').hide();
          $('.view-home').show();
        } else {
          $('.view-detail').show();
          $('.view-home').hide();
        }
      }
    };
  }]);
