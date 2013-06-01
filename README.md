mapred.io
=========

mapreduce based on socket.io  
You can use this module, use the browser to easily build mapreduce programming model based on parallel computing platform. On this platform, you can submit the page using javascript mapreduce tasks.



## Server
```js
var app = require('http').createServer(handler)
  , fs = require('fs')
  , io = require('mapred.io').listen(app)
  , parse = require('url').parse;
  
  app.listen(80);
  io.set('log level', 2);

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
  if (info.pathname.match(/\/public/))
	fs.readFile(__dirname + info.pathname, hander )
  else if (info.pathname.match(/\/client/))
	fs.readFile(__dirname + '/client.html', hander )
  else fs.readFile(__dirname + '/job.html', hander )
}



```

## Client
```html
<script type="text/javascript" src="/socket.io/socket.io.js"></script>
<script type="text/javascript" src="/socket.io/mapred.io.js"></script>
<script type="text/javascript" >
var socket = io.connect();
var MapredClient = new MapredClient(socket);
</script>
```
## Submit Job
```html
<script type="text/javascript" src="/socket.io/socket.io.js"></script>
<script type="text/javascript" src="/socket.io/mapred.io.js"></script>
<script type="text/javascript" >

var input = [
	['frase primera', 'primer trozo de informacion para procesado primer trozo'],
	['segunda frase', 'segundo trozo de informacion trozo de'],
	['cacho 3', 'otro trozo para ser procesado otro otro otro trozo'],
	['cuarta frase', 'primer trozo de informacion para procesado primer trozo'],
	['frase 5', 'segundo trozo de informacion trozo de']
], inputs = input, i;
//for ( i = 0 ; i &lt; 20000 ; i ++ ) inputs = inputs.concat(input);

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
    }).toString(), inputs:inputs)
```
## To do
1. Performance Test
2. Client program (the standalone client not on the browser).
3. Stored the datas (the server do not have enough memory to handle large data, Need a fast persistent storage framework)

![screenshot](https://f.cloud.github.com/assets/1826685/594156/1a112198-ca5d-11e2-87cd-cc11069e530f.png)
update the screeshot
