'use strict';

function SSC(req, res, type, idField) {
  this.req = req;
  this.res = res;
  this.type = type;
  this.idField = idField;
  var client = this;
  this.res.on('close', function () {
    client.res.end();
  });
}

SSC.prototype.connect = function () {
  this.res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  });
  this.res.write(':ok\n\n');
};

SSC.prototype.sendEvent = function (data) {
  this.res.write('event: ' + this.type + '\n');
  if(this.idField) {
    this.res.write('id: ' + data[this.idField] + '\n');
  }
  this.res.write('data:' + JSON.stringify(data) + '\n\n');
};

SSC.prototype.disconnect = function () {
  this.res.write('event: close\n');
  this.res.write('data: 0\n\n');
  this.res.end();
};

module.exports = SSC;

