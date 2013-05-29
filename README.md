# mapred.io
=========

mapreduce based on socket.io


## Server
```js
var app = require('http').createServer(handler)
  , fs = require('fs')
  , io = require('socket.io').listen(app, { log: false })
  , parse = require('url').parse
  , mio = require('mapred.io')(io);
  app.listen(80);


function handler (req, res) {
  var info = parse(req.url, true);

  var hander = function (err, data) {
	if (err) {
	  res.writeHead(500);
	  return res.end('Error loading file');
	}

	res.writeHead(200);
	res.end(data);
  }
  if (info.pathname === '/jquery.min.js')
	fs.readFile(__dirname + info.pathname, hander )
  else if (info.pathname === '/job.html')
	fs.readFile(__dirname + '/job.html', hander )
  else fs.readFile(__dirname + '/test.html', hander )
}
```

## Client
```html
<script type="text/javascript" src="/socket.io/socket.io.js"></script>
<script type="text/javascript" src="/socket.io/mapred.io.js"></script>
```
## Submit Job
```html
<script type="text/javascript" src="/socket.io/socket.io.js"></script>
<script type="text/javascript" src="/socket.io/mapred.io.js"></script>
<script type="text/javascript" >

socket.emit('job', { map: (function(key, value){
  	var list = [], aux = {};
		value = value.split(' ');
		value.forEach(function(w){
			aux[w] = (aux[w] || 0) + 1;
		});
		for(var k in aux){
			list.push([k, aux[k]]);
		}
		return list;
	}).toString(), reduce: (function(key, values){
		var sum = 0;
		values.forEach(function(e){
			sum += e;
		});
		return sum;
	}).toString(), inputs:[
		['frase primera', 'primer trozo de informacion para procesado primer trozo'],
		['segunda frase', 'segundo trozo de informacion trozo de'],
		['cacho 3', 'otro trozo para ser procesado otro otro otro trozo'],
		['cuarta frase', 'primer trozo de informacion para procesado primer trozo'],
		['frase 5', 'segundo trozo de informacion trozo de'],
		['frase primera', 'primer trozo de informacion para procesado primer trozo'],
		['segunda frase', 'segundo trozo de informacion trozo de']
  ])
```

