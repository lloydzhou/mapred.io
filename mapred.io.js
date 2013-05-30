/**
 * MapReduce implementation based on socket.io
 */

/**
 * Export the constructor.
 */

exports = module.exports = function(io){ return new Mapred(io);}
//Mapred;

function Mapred (io, debug) {
	this.io = io;
	this.jobs = {};
	this.clients = {};// stored the client id, and the task number runing.
	this.init();
	this.debug = ('undefined' === typeof debug ? true : debug);
};
Mapred.prototype.init = function() {
	var $mapred = this;
	$mapred.io.static.add('/mapred.io.js', {file: __dirname + '/mapred.io-client.js'});
	$mapred.io.sockets.on('connection', function (socket) {
		$mapred.registerClient(socket.id);
		socket.emit('ready', socket.id);
		//io.sockets.emit('message', socket.id + ' have been join this cluster.');
		$mapred.io.sockets.emit('join', socket.id);
		socket.on('job', function(jobconf){
			// listing the client to submit one job.
			// create new job, split the inputs and start to run map tasks.
			var job = new JobConf($mapred, jobconf, socket.id);
			$mapred.jobs[job.id] = job;
			job.initMapTask(function(tasks){
				var clients = $mapred.getClients(), i = 0;
				for(var id in tasks) $mapred.assignTask(tasks[id], clients[i++], 'map');
			});
		});
		socket.on('flod', function(data){
			// set status of the map tasks, and assign next task to this client if another one not running,
			// if all map tasks are complated then merge all the results and start to run reduce tasks.
			var job = $mapred.jobs[data.jobId];
			job.complateMapTask(data, function(task){
				task.stat = 'running';
				socket.emit('map', task);
				$mapred.clients[socket.id].task++;
			}, function(tasks){
				var clients = $mapred.getClients(), i = 0;
				for(var id in tasks) 
					if (clients[i]) $mapred.assignTask(tasks[id], clients[i++], 'reduce');
			});
		});
		socket.on('result', function(data){
			var job = $mapred.jobs[data.jobId];
			job.complateReduceTask(data, function(task){
				task.stat = 'running';
				socket.emit('reduce', task);
				$mapred.clients[socket.id].task++;
			}, function(results){
				console.log('job: ' + results.jobconf.jobid + ', using: ' + results.jobconf.time.using + ' ms, input size: ' + results.jobconf.inputSize + ', maper: ' + results.jobconf.mapTaskNum + ', reducer: ' + results.jobconf.reduceTaskNum + '.')
				$mapred.io.sockets.socket(job.clientId).emit('result', results);
			});
		});
		socket.on('error', function(data){
			$mapred.blockClient(socket.id);
			$mapred.assignTask(data, $mapred.getClient(), data.map ? 'map' : 'reduce');
		});
		socket.on('disconnect', function(data){
			$mapred.unregisterClient(socket.id);
			$mapred.io.sockets.emit('leave', socket.id);
		});

	});
};
Mapred.prototype.blockClient = function(clientId)
{
	this.clients[clientId].isblock = true;
}
Mapred.prototype.registerClient = function(clientId)
{
	this.debug && console.log('registerClient: ' + clientId)
	this.clients[clientId] = {task: 0, isblock: false};
}
Mapred.prototype.unregisterClient = function(clientId)
{
	this.debug && console.log('unregisterClient: ' + clientId)
	delete this.clients[clientId];
}
Mapred.prototype.assignTask = function(task, clientId, event)
{
	this.debug && console.log('assignTask: ' + task.id + ' -> ' + clientId)
	this.clients[clientId].task++;
	task.stat = 'running';
	this.io.sockets.socket(clientId).emit(event, task);
}
Mapred.prototype.complateTask = function(task, clientId)
{
	this.clients[clientId].task--;
}
Mapred.prototype.getClients = function(task, clientId)
{
	var clients = [];
	for (var id in this.clients) if (!(this.clients.isblock)) clients.push(id);
	return clients;
}
Mapred.prototype.getClient = function()
{
	for (var id in this.clients) if (!(this.clients.isblock)) return id;
}

/**
 * JobConf constructor.
 *
 * @param {io} mapred.io instance
 * @param {conf} conf of this job
 * @param {clientId} client id whitch client submit this job
 * @api public
 */
function JobConf(mio, conf, clientId)
{
	var clients = mio.io.sockets.clients();
	this.time = {start: new Date()};
	this.mio = mio;
	this.conf = conf;
	this.clientId = clientId;
	this.inputSize = 0;
	this.id = mio.io.sockets.manager.generateId();
	this.mapTaskNum = conf.mapTaskNum || clients.length || 1;
	this.mapTasks = {};
	this.reduceTaskNum = conf.reduceTaskNum || clients.length || 1;
	this.reduceTasks = {};
}
JobConf.prototype.initMapTask = function(callback)
{
	console.log('initMapTask');
	var i =0, pieces = this.conf.inputs, num = this.mapTaskNum, len = Math.floor(pieces.length / this.mapTaskNum) + 1;
	this.inputSize = pieces.length;
	for (; i < num; i++)
	{
		var id = this.mio.io.sockets.manager.generateId();
		this.mapTasks[id] = {jobId: this.id, id: id, stat: 'create', map: this.conf.map, pieces: pieces.splice(0, len) };
	}
	this.time['initMapTask'] = new Date();
	console.log('assignMapTask');
	callback && callback(this.mapTasks);
}
JobConf.prototype.complateMapTask = function(data, taskCallback, callback)
{
	console.log('complateMapTask: ' + data.id);
	this.mapTasks[data.id].stat = 'complate';
	this.mapTasks[data.id].groups = data.groups;
	var count = 0;
	for (var id in this.mapTasks)
	{
		if(this.mapTasks[id].stat === 'create') 
		{
			return taskCallback(this.mapTasks[id]);
		}
		if (this.mapTasks[id].stat === 'complate') count++;
	}
	if (count ===  this.mapTaskNum)	this.initReduceTask(callback);
}
JobConf.prototype._merge = function(map, callback)
{
	console.log('merge result: ' + map);
	var groups = {}, tasks = (map ? this.mapTasks : this.reduceTasks), count = 0;
	for (var id in tasks)
	{
		for (var key in tasks[id].groups)
			if (groups[key]) 
				groups[key] = groups[key].concat(tasks[id].groups[key]);
			else {
				groups[key] = tasks[id].groups[key]; 
				count++;
			}
			//groups[key] = (groups[key]) ? groups[key].concat(tasks[id].groups[key]) : tasks[id].groups[key];
	}
	callback && callback(this, groups, count);
}
JobConf.prototype.initReduceTask = function(callback)
{
	console.log('initReduceTask. ');
	// merge all results from maper...............
	this._merge(true, function(job, groups, count){
		job.reduceTaskNum = job.reduceTaskNum > count ? count : job.reduceTaskNum;
		var num = job.reduceTaskNum, i = -num, ids = [];
		for (; i < 0; i++)
		{
			var id = ids[i + num] = job.mio.io.sockets.manager.generateId();
			job.reduceTasks[id] = {jobId: job.id, id: id, stat: 'create', reduce: job.conf.reduce, groups: {} };
		}
		for (var key in groups)
		{
			job.reduceTasks[ids[++i % num]].groups[key] = groups[key];
		}
		job.time['initReduceTask'] = new Date();
		callback && callback(job.reduceTasks);
	})
}
JobConf.prototype.complateReduceTask = function(data, taskCallback, callback)
{
	console.log('complateReduceTask: ' + data.id);
	this.reduceTasks[data.id].stat = 'complate';
	this.reduceTasks[data.id].groups = data.groups;
	var count = 0;
	for (var id in this.reduceTasks)
	{
		if(this.reduceTasks[id].stat === 'create') 
		{
			return taskCallback(this.reduceTasks[id]);
		}
		if (this.reduceTasks[id].stat === 'complate') count++;
	}
	if (count ===  this.reduceTaskNum) 
		this._merge(false, function(job, groups){
			job.time['end'] = new Date();
			job.time['using'] = job.time['end'] - job.time['start'];
			callback({jobconf:{time: job.time, jobid: job.id, mapTaskNum: job.mapTaskNum, reduceTaskNum: job.reduceTaskNum, inputSize: job.inputSize}, results:groups})
		});
}
