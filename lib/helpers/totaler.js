
function Totaler() {
  this.totals = {};
}

Totaler.prototype.getTotalsKey = function(date) {
  return date.getMonth() + '_' + date.getFullYear();
};

Totaler.prototype.newTotal = function (date) {
  return {
    // _id: getTotalsKey(date),
    year: date.getFullYear(),
    month: date.getMonth(),
    number_of_cyclist_injured: 0,
    number_of_cyclist_killed: 0,
    number_of_motorist_injured: 0,
    number_of_motorist_killed: 0,
    number_of_pedestrians_injured: 0,
    number_of_pedestrians_killed: 0,
    number_of_persons_injured: 0,
    number_of_persons_killed: 0,
    total_accidents: 0,
    result_injury: 0,
    result_death: 0,
    vehicles: {},
    factors: {},
    times: {}
  };
};

Totaler.prototype.getTypeTotal = function(currType, crash, type) {
  var newTypeTotals = currType;
  var t1 = crash[type + '_1'],
    t2 = crash[type + '_2'],
    t3 = crash[type + '_3'],
    t4 = crash[type + '_4'],
    t5 = crash[type + '_5'];

  if(t1) {
    if(newTypeTotals[t1]) {
      newTypeTotals[t1] += 1;
    } else {
      newTypeTotals[t1] = 1;
    }
  }

  if(t2) {
    if(t2 !== t1) {
      if(newTypeTotals[t2]) {
        newTypeTotals[t2] += 1;
      } else {
        newTypeTotals[t2] = 1;
      }
    }
  }

  if(t3) {
    if(t3 !== t1 && t3 !== t2) {
      if(newTypeTotals[t3]) {
        newTypeTotals[t3] += 1;
      } else {
        newTypeTotals[t3] = 1;
      }
    }
  } else {
    return newTypeTotals;
  }

  if(t4) {
    if(t4 !== t1 && t4 !== t2 && t4 !== t3) {
      if(newTypeTotals[t4]) {
        newTypeTotals[t4] += 1;
      } else {
        newTypeTotals[t4] = 1;
      }
    }
  } else {
    return newTypeTotals;
  }

  if(t5) {
    if(t5 !== t1 && t5 !== t2 && t5 !== t3 && t5 !== t4) {
      if(newTypeTotals[t5]) {
        newTypeTotals[t5] += 1;
      } else {
        newTypeTotals[t5] = 1;
      }
    }
  }

  return newTypeTotals;
};

Totaler.prototype.calcTotals = function (crash) {
  var key = this.getTotalsKey(crash.date);

  if(!this.totals[key]) {
    this.totals[key] = this.newTotal(crash.date);
  }

  this.totals[key].number_of_cyclist_injured += crash.number_of_cyclist_injured;
  this.totals[key].number_of_cyclist_killed += crash.number_of_cyclist_killed;
  this.totals[key].number_of_motorist_injured += crash.number_of_motorist_injured;
  this.totals[key].number_of_motorist_killed += crash.number_of_motorist_killed;
  this.totals[key].number_of_pedestrians_injured += crash.number_of_pedestrians_injured;
  this.totals[key].number_of_pedestrians_killed += crash.number_of_pedestrians_killed;
  this.totals[key].number_of_persons_injured += crash.number_of_persons_injured;
  this.totals[key].number_of_persons_killed += crash.number_of_persons_killed;
  this.totals[key].total_accidents += 1;

  if (crash.number_of_cyclist_killed > 0 || crash.number_of_persons_killed > 0 || crash.number_of_pedestrians_killed > 0 || crash.number_of_motorist_killed > 0) {
    this.totals[key].result_death += 1;
  }

  if (crash.number_of_cyclist_injured > 0 || crash.number_of_persons_injured > 0 || crash.number_of_pedestrians_injured > 0 || crash.number_of_motorist_injured > 0) {
    this.totals[key].result_injury += 1;
  }

  this.totals[key].vehicles = getTypeTotal(this.totals[key].vehicles, crash, 'vehicle_type_code');
  this.totals[key].factors = getTypeTotal(this.totals[key].factors, crash, 'contributing_factor_vehicle');

  if (this.totals[key].times[crash.time]) {
    this.totals[key].times[crash.time] += 1;
  } else {
    this.totals[key].times[crash.time] = 1;
  }
};

module.exports = Totaler;
