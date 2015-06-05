var asyncP = (function() {
  var run = function(generator) {
    var seq;
    var process = function(result) {
      result.value.then(function(val) {
        if(!result.done) { process(seq.next(val)); }
      });
    };

    seq = generator();
    var next = seq.next();
    process(next);
  };

  return{
    run:run
  };
}());

module.exports = asyncP;
