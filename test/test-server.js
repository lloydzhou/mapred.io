var app = require('http').createServer(handler)
  , fs = require('fs')
  , io = require('socket.io').listen(app, {log: false})
  , parse = require('url').parse
  , mio = require('mapred.io')(io, false);
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
  if (info.pathname.match(/\/public/))
	fs.readFile(__dirname + info.pathname, hander )
  else if (info.pathname.match(/\/client/))
	fs.readFile(__dirname + '/client.html', hander )
  else fs.readFile(__dirname + '/job.html', hander )
}


