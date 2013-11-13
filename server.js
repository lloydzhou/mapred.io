var app = require('http').createServer(handler)
  , fs = require('fs')
  , io = require('mapred.io').listen(app)
  , parse = require('url').parse
  , port = process.argv[2] || 80;

  app.listen(port);
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
