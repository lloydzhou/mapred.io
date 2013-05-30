function MapredClient(socket, opt)
{
	this.socket = socket;
	this.opt = opt || {messageCallback: this.defalutCallback, log: this.defalutCallback, resultCallback: this.defalutCallback};
	this.init();
	this.onMap();
	this.onReduce();
	this.onResult();
}
MapredClient.prototype.defalutCallback = function(data)
{
	console && console.log(data);
}
MapredClient.prototype.init = function()
{
	socket.on('ready', function(data){document.title = data;})
	socket.on('message', this.opt.messageCallback || this.defalutCallback)
}
MapredClient.prototype.log = function()
{
	$this.opt.log && $this.opt.log(data) || $this.defalutCallback(data);
}
MapredClient.prototype.onMap = function()
{
	var $this = this;
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
		} catch(err) {
			console.log("Error name: " + err.name + "Error message: " + err.message)
//			data.err = err;
//			socket.emit('error', data);
//			$this.log("Error name: " + err.name + "");
//			$this.log("Error message: " + err.message);
		}

	});
};
MapredClient.prototype.onReduce = function()
{
	var $this = this;
	socket.on('reduce', function (data) {
		try{
			eval('var reduce = ' + data.reduce + ';');
			var groups = data.groups;
			
			for(var k in groups){
				groups[k] = reduce(k, groups[k]);
			}
			data.groups = groups;
			socket.emit('result', data);
		} catch(err) {
			console.log("Error name: " + err.name + "Error message: " + err.message)
			//data.err = err;
			//socket.emit('error', data);
			//$this.log("Error name: " + err.name + "");
			//$this.log("Error message: " + err.message);
		}
	});
};
MapredClient.prototype.onResult = function()
{
	socket.on('result', this.opt.resultCallback || this.defalutCallback)
};
