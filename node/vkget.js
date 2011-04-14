var sys = require("sys"),
    http = require("http"),
    url = require('url'),
    events = require('events'),
    exec = require('child_process').exec,
    querystring = require('querystring'),
    fs = require('fs'),
    async = require('async'),
    crypto = require('crypto'),
    hs = require('node-handlersocket');
    
http.createServer(function(request, response) {
    var uri = url.parse(request.url).href;
    
    request.content = '';
    request.addListener('data', function(data) {
        request.content += data;
    });
    request.addListener('end', function() {
        request.content = querystring.parse(request.content);
        if (request.content.data) {
            request.content.data = JSON.parse(request.content.data);
        }
        if (uri === '/ajax') {
            if (!request.content.action) {
                response.write('No action');
                response.end();
            } else {
                if (typeof ajax[request.content.action] == 'function') {
                    ajax[request.content.action](request, response);
                } else {
                    response.write('No action "' + request.content.action + '"');
                    response.end();
                }
            }
        }
    });
    
    response.writeHead(200, {
        'Content-Type': 'text/plain',
        'Server': 'mosaic',
        'Date': new Date()
    });
}).listen(8080);
sys.puts("Server running at http://localhost:8080/");

ajax = new events.EventEmitter();
(function(obj) {
    var _class = {
        sendData: function(data, response) {
            response.write(JSON.stringify(data));
            response.end();
        },

        sendOk: function(response) {
            response.write(querystring.stringify({
                response: 'ok'
            }));
            response.end();
        },

        init: function() {
            this.addListener('ajax sendOk', this.sendOk);
            this.addListener('ajax sendData', this.sendData);
        },

        downloadPhotos: function(request, response) {
            var data = request.content.data;
            if (!data.albums) {
                return this.emit('ajax sendData', 'No albums', response);
            }
            if (!data.photos) {
                return this.emit('ajax sendData', 'No photos', response);
            }
            if (!data.albums[0].owner_id) {
                return this.emit('ajax sendData', 'No owner', response);
            }
            photos.download(request, response);
        },
        
        saveFavorite: function(request, response) {
            var data = request.content.data;
            if (!data.user_id) {
                return this.emit('ajax sendData', 'No user_id', response);
            }
            if (!data.uid) {
                return this.emit('ajax sendData', 'No uid', response);
            }
            favorites.save(request, response);
        },
        
        getFavorites: function(request, response) {
            var data = request.content.data;
            if (!data.user_id) {
                return this.emit('ajax sendData', 'No user_id', response);
            }
            favorites.get(request, response);
        }
    }
    for (var i in _class) {
        obj[i] = _class[i];
    }
    obj.init();
})(ajax);

var photos = {
    download: function(request, response) {
        var data = request.content.data;
        var albums = data.albums;
        var photos = data.photos;
        var self = this;
        var ip = request.headers['x-real-ip'];
        var uid = data.albums[0].owner_id;
        
        this.getPhotosNotInDb(uid, ip, albums, photos, 
            function(uid, ip, albums, photos) {
                var length = 0;
                for (var i in photos) {
                    length++;
                }
                if (!length) {
                    self.makeLink(uid, ip, function(err, result) {
                        if (result) {
                            console.log('Done ' + uid + ' url: ' + result);
                            ajax.emit('ajax sendData', {url: result}, response);
                        } else {
                            console.log('Error ' + uid);
                            ajax.emit('ajax sendData', 'error', response);
                        }
                    });
                } else {
                    async.series([
                        async.apply(self.makeUserDir, uid),
                        async.apply(self.makeAlbumsDirs, uid, albums),
                        async.apply(self.savePhotos, uid, albums, photos),
                        async.apply(self.makeArchive, uid),
                        async.apply(self.savePhotosToDb, uid, albums, photos),
                        async.apply(self.makeLink, uid, ip)
                    ], 
                    function(err, results) {
                        if (results[5]) {
                            console.log('Done ' + uid + ' url: ' + results[5]);
                            ajax.emit('ajax sendData', {url: results[5]}, response);
                        } else {
                            console.log('Error ' + uid);
                            ajax.emit('ajax sendData', 'error', response);
                        }
                    });
                }
            }
        );
        this.log(uid, photos);
    },
    
    makeUserDir: function(uid, callback) {
        fs.mkdir('/var/www/vkget/photos/' + uid, '0755', function() {
            callback(null, null);
        });
    },
    
    makeAlbumsDirs: function(uid, albums, callback) {
        async.map(albums, function(album, callback) {
            var aid = album.aid;
            var title = album.title ? album.title : aid;
            fs.mkdir('/var/www/vkget/photos/' + uid + '/' + title, '0755', function() {
                console.log('Created ' + uid + '/' + title);
                callback(null, null);
            });
        }, function(err, results) {
            callback(null, null);
        });
    },
    
    savePhotos: function(uid, albums, photos, callback) {
        async.map(albums, function(album, callback) {
            var aid = album.aid;
            var title = album.title ? album.title : aid;
            if (typeof photos[aid] != 'undefined') {
                var albumPhotos = photos[aid];
                var files = [];
                
                for (var i in albumPhotos) {
                    if (typeof albumPhotos[i] == 'undefined') continue;
                    
                    var file = '';
                    if (albumPhotos[i].src_xxbig) {
                        file = albumPhotos[i].src_xxbig;
                    } else if (albumPhotos[i].src_xbig) {
                        file = albumPhotos[i].src_xbig;
                    } else if (albumPhotos[i].src_big) {
                        file = albumPhotos[i].src_big;
                    } else if (albumPhotos[i].src) {
                        file = albumPhotos[i].src;
                    } else if (albumPhotos[i].src_small) {
                        file = albumPhotos[i].src_small;
                    }
                    if (file.match(/^http:\/\/cs[0-9]+\.vkontakte\.ru\/u[0-9]+\/[0-9]+\/.*?\.jpg$/)) {
                        files.push(file);
                    }
                }

                files = files.join(' ');
                if (files) {
                    console.log('Download started ' + uid + '/' + title);
                    exec('cd "/var/www/vkget/photos/' + uid + '/' + title + '" && wget ' + files, function(error, stdout, stderr) {
                        if (error !== null && !stderr) {
                            console.log('exec error: ' + error);
                            console.log('sterr: ' + stderr);
                        } else {
                            console.log('Downloaded ' + uid + '/' + title);
                            callback(null, null);
                        }
                    });
                }
            } else {
                callback(null, null);
            }
        }, function(err, results) {
            callback(null, null);
        });
    },
    
    makeArchive: function(uid, callback) {
        exec('zip -9 -q -r -j -u "/var/www/vkget/archives/' + uid + '.zip" "/var/www/vkget/photos/' + uid + '"', function(error, stdout, stderr) {
            if (error !== null && !stderr) {
                console.log('exec error: ' + error);
                console.log('sterr: ' + sterr);
            } else {
                console.log('Zipped ' + uid);
                callback(null, null);
            }
        });
    },
    
    makeLink: function(uid, ip, callback) {
        var uri = '/' + uid + '.zip';
        var expire = Math.round((new Date()).getTime() / 1000) + 86400;
        var secret = crypto.createHash('md5').update('vkget_' + ip + uri + expire).digest('base64');
        secret = secret.replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
        var uri = 'http://photos.vkget.ru'  + uri + '?st=' + secret + '&e=' + expire;
        callback(null, uri);
    },
    
    getPhotosNotInDb: function(uid, ip, albums, photos, callback) {
        var newPhotos = {};
        var con = hs.connect();
        con.on('connect', function() {
            con.openIndex(
                'vkget',
                'photos',
                'PRIMARY',
                ['pid'],
                function(err, index) {
                    for (var album in photos) {
                        for (var i in photos[album]) {
                            index.find('=', photos[album][i].pid, 
                                async.apply(
                                    function(album, photo, err, result) {
                                        if (!result.length) {
                                            if (typeof newPhotos[album] == 'undefined') {
                                                newPhotos[album] = [];
                                            }
                                            newPhotos[album].push(photo);
                                        }
                                    }, album, photos[album][i]
                                )
                            );
                        }
                    }
                    con.end();
                }
            );
        });
        con.on('end', function() {
            callback(uid, ip, albums, newPhotos);
        });
    },
    
    savePhotosToDb: function(uid, albums, photos, callback) {
        var con = hs.connect({port : 9999});
        con.on('connect', function() {
            con.openIndex(
                'vkget',
                'photos',
                'uid',
                ['uid', 'aid', 'pid', 'created_on'],
                function(err, index) {
                    for (var album in photos) {
                        for (var i in photos[album]) {
                            if (typeof photos[album][i] == 'undefined') continue;
                            
                            index.insert([
                                parseInt(photos[album][i].owner_id),
                                parseInt(photos[album][i].aid),
                                parseInt(photos[album][i].pid),
                                Math.round((new Date()).getTime() / 1000)
                            ], function(err) {
                                if (err) {
                                    //console.log(err);
                                }
                            });
                        }
                    }
                    con.end();
                    callback(null, null);
                }
            );
        });
    },
    
    log: function(uid, photos) {
        var con = hs.connect({port: 9999});
        var albumsCount = photosCount = 0;
        for (var i in photos) {
            albumsCount++;
            for (var j in photos[i]) {
                photosCount++;
            }
        }
        
        con.on('connect', function() {
            con.openIndex(
                'vkget',
                'logs',
                'PRIMARY',
                ['day', 'hour', 'users', 'albums', 'photos'],
                function(err, index) {
                    var date = new Date();
                    var month = date.getMonth(), day = date.getDay();
                    month = month < 10 ? '0' + month : month;
                    day   = day   < 10 ? '0' + day   : day;
                    var currentDate = date.getFullYear() + '-' + month + '-' + day;
                    var currentHour = date.getHours();
                    
                    index.find('=', [currentDate, currentHour], 
                        async.apply(
                            function(currentDate, currentHour, err, result) {
                                if (!result.length) {
                                    index.insert([currentDate, currentHour, 1, albumsCount, photosCount], function(err) {
                                        con.end();
                                    });
                                } else {
                                    var currentDate = result[0][0];
                                    var currentHour = result[0][1];
                                    var users  = parseInt(result[0][2]);
                                    var albums = parseInt(result[0][3]);
                                    var photos = parseInt(result[0][4]);
                                    users  += 1;
                                    albums += albumsCount;
                                    photos += photosCount;
                                    index.update('=', [currentDate, currentHour], [currentDate, currentHour, users, albums, photos], function(err, rows) {
                                        con.end();
                                    });
                                }
                            },
                            currentDate, currentHour
                        )
                    );
                }
            );
        });
    }
}

var favorites = {
    get: function(request, response) {
        var data = request.content.data;
        var user_id = data.user_id;
        
        var con = hs.connect();
        con.on('connect', function() {
            con.openIndex(
                'vkget',
                'favorites',
                'user_id',
                'uid',
                async.apply(
                    function(user_id, err, index) {
                        index.find('=', user_id, function(err, results) {
                            ajax.emit('ajax sendData', {response: results}, response);
                        });
                    },
                    user_id
                )
            );
        });
    },
    
    save: function(request, response) {
        var data = request.content.data;
        var user_id = data.user_id;
        var uid = data.uid;
        
        var con = hs.connect({port: 9999});
        con.on('connect', function() {
            con.openIndex(
                'vkget',
                'favorites',
                'PRIMARY',
                ['user_id', 'uid'],
                async.apply(
                    function(user_id, uid, err, index) {
                        index.insert([user_id, uid], function() {
                            con.end();
                            ajax.emit('ajax sendOk', response);
                        });
                    },
                    user_id, uid
                )
            );
        });
    }
}