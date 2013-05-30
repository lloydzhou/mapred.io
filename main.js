/**
 * MapReduce implementation based on socket.io
 */

/**
 * Export the constructor.
 */

exports = module.exports = Mapred;

function Mapred (io) {
  this.io = io;
	this.jobs = {};
	io.static.add('/mapred.io.js', {file: __dirname + '/mapred.io.js'});
	io.sockets.on('connection', function (socket) {
		socket.emit('ready', 'Hi, ' + socket.id + ' welcome to join this cluster.');
		socket.on('job', function(jobconf){
			// listing the client to submit one job.
			// create new job, split the inputs and start to run map tasks.
			var job = new JobConf(io, jobconf, socket.id);
			jobs[job.id] = job;
			job.initMapTask(function(tasks){
				var clients = io.sockets.clients(), i = 0;
				for(var id in tasks) 
				{
					if (clients[i])
					{
						tasks[id].stat = 'running';
						clients[i++].emit('map', tasks[id]);
					}
				}
			});
		});
		socket.on('flod', function(data){
			// set status of the map tasks, and assign next task to this client if another one not running,
			// if all map tasks are complated then merge all the results and start to run reduce tasks.
			var job = jobs[data.jobId];
			job.complateMapTask(data, function(task){
				task.stat = 'running';
				socket.emit('map', task);
			}, function(tasks){
				var clients = io.sockets.clients(), i = 0;
				for(var id in tasks) 
				{
					if (clients[i])
					{
						tasks[id].stat = 'running';
						clients[i++].emit('reduce', tasks[id]);
					}
				}
			});
		});
		socket.on('result', function(data){
			// 
			var job = jobs[data.jobId];
			job.complateReduceTask(data, function(task){
				task.stat = 'running';
				socket.emit('reduce', task);
			}, function(results){
				console.log(results)
				io.sockets.socket(job.clientId).emit('result', results);
			});
		});
		socket.on('error', function(data){
			console.log(data)
		});
	});
};

/**
 * JobConf constructor.
 *
 * @param {io} socket.io instance
 * @param {conf} conf of this job
 * @param {clientId} client id whitch client submit this job
 * @api public
 */
function JobConf(io, conf, clientId)
{
	var clients = io.sockets.clients();
	this.io = io;
	this.conf = conf;
	this.clientId = clientId;
	this.id = io.sockets.manager.generateId();
	this.mapTaskNum = conf.mapTaskNum || clients.length || 1;
	this.mapTasks = {};
	this.reduceTaskNum = conf.reduceTaskNum || clients.length || 1;
	this.reduceTasks = {};
}
JobConf.prototype.initMapTask = function(callback)
{
	var i =0, pieces = this.conf.inputs, num = this.mapTaskNum, len = Math.floor(pieces.length / this.mapTaskNum) + 1;
	for (; i < num; i++)
	{
		var id = this.io.sockets.manager.generateId();
		this.mapTasks[id] = {jobId: this.id, id: id, stat: 'create', map: this.conf.map, pieces: pieces.splice(0, len) };
	}
	callback && callback(this.mapTasks);
}
JobConf.prototype.complateMapTask = function(data, taskCallback, callback)
{
	//console.log(this.mapTasks);
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
	var groups = {}, tasks = (map ? this.mapTasks : this.reduceTasks);
	for (var id in tasks)
	{
		for (var key in tasks[id].groups)
			groups[key] = (groups[key]) ? groups[key].concat(tasks[id].groups[key]) : tasks[id].groups[key];
	}
	callback && callback(this, groups);
}
JobConf.prototype.initReduceTask = function(callback)
{
	// merge all results from maper...............
	this._merge(true, function(job, groups){
		var num = job.reduceTaskNum, i = -num, ids = [];
		for (; i < 0; i++)
		{
			var id = ids[i + num] = job.io.sockets.manager.generateId();
			job.reduceTasks[id] = {jobId: job.id, id: id, stat: 'create', reduce: job.conf.reduce, groups: {} };
		}
		for (var key in groups)
		{
			job.reduceTasks[ids[++i % num]].groups[key] = groups[key];
		}
		callback && callback(job.reduceTasks);
	})
}
JobConf.prototype.complateReduceTask = function(data, taskCallback, callback)
{
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
			callback(groups)
		});
}
