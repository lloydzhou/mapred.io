var socket = require('socket.io-client');
var mapred = require('mapred.io')
var client = new mapred.Client(socket.connect('http://localhost:9999'), {messageCallback: function(data){
		console.log('message', data);
	}, resultCallback: function(data){
		console.log('result', data);
	}, joinCallback: function(data){
		console.log(data + ' joined');
	}, leaveCallback: function(data){
		console.log(data + ' leaved');
	}
});
process.stdin.resume();

process.stdin.on('data', function(chunk) {
  process.stdout.write('data: ' + chunk);
});

process.stdin.on('end', function() {
  process.stdout.write('end');
});