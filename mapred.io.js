var socket = io.connect();

socket.on('ready', function (data) {console.log(data)})

socket.on('map', function (data) {
  try {
		eval('var map = ' + data.map + ';');
		var intermediate = [], groups = null;
		
		data.pieces.forEach(function(elem, index){
			var key = elem[0], value = elem[1];
			intermediate = intermediate.concat(map(key, value));
		});
		intermediate.sort();
		
		groups = intermediate.reduce(function(res, current){
			var group = res[current[0]] || [];
			group.push(current[1]);
			res[current[0]] = group;
			return res; 
		}, {});
		delete data['pieces'];
		data.groups = groups;
		socket.emit('flod', data);
		//console.log(groups);
	} catch(err) {
		socket.emit('error', data);
		console.log(data);
		console.log("Error name: " + err.name + "");
		console.log("Error message: " + err.message);
	}

});

socket.on('reduce', function (data) {
	try{
		eval('var reduce = ' + data.reduce + ';');
		var groups = data.groups;
		
		for(var k in groups){
			groups[k] = reduce(k, groups[k]);
		}
		console.log(groups);
		data.groups = groups;
		socket.emit('result', data);
	} catch(err) {
		socket.emit('error', data);
		console.log("Error name: " + err.name + "");
		console.log("Error message: " + err.message);
	}
});

socket.on('result', function (data) {
	console.log('Results: ')
	console.log(data)
})
