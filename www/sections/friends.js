globalObj.sections.friends = {
    params: {
        sectionContainer: null,
        friendsContainer: null,
        friendRow: null,
        albumInfoRow: null,
        friends: {},
        currentDownloads: 0
    },
    
    init: function() {
        this.params.sectionContainer = $('<div class="friends" />');
        this.params.friendsContainer = $('<div />');
        this.params.friendsContainer.appendTo(this.params.sectionContainer);
        $('div.sections').append(this.params.sectionContainer);
        
        this.params.friendRow = $('<div class="user"><div class="small img" /><h3 class="name"></h3><h4 class="nickname"></h4><h5 class="domain"></h5><div class="data"><img src="loading.gif" /></div></div>');
        this.params.friendRow.bind('click', {self: this}, this.toggleData);
        
        this.params.albumInfoRow = $('<div></div>');
        
        var _self = this;
        VK.Api.call('friends.get', {fields: ['uid', 'first_name', 'last_name', 'nickname', 'photo', 'photo_big', 'domain']}, function(r) {
            if (r.response) {
                _self.setData(r.response);
            }
        });
        
        var search = $('<input type="search" />');
        search.prependTo(this.params.sectionContainer);
        search.bind('keyup', {self: this}, this.search);
    },
    
    reset: function() {
        this.params.friendsContainer.empty();
    },
    
    setData: function(dataArray) {
        for (var i in dataArray) {
            this.params.friends[dataArray[i].uid] = dataArray[i];
        }
        
        this.reset();
        this.show();
    },
    
    show: function() {
        var friends = this.params.friends;
        
        for (var i in friends) {
            var el = this.params.friendRow.clone(true);
            
            $(el).attr('uid', friends[i].uid);
            $('.name', el).text(friends[i].first_name + ' ' + friends[i].last_name);
            $('.nickname', el).text(friends[i].nickname);
            $('.domain', el).text(friends[i].domain);
            $('.domain', el).text(friends[i].domain);
            $('.small', el).css('background', 'url(' + friends[i].photo + ')');
            
            el.appendTo(this.params.friendsContainer);
        }
    },
    
    search: function(e) {
        var _this = e.data.self;
        var els = $(_this.params.friendsContainer).children();
        var text = this.value;
        var search = new RegExp(text, 'i');
        
        els.each(function(index, el) {
            if ($(el).text().search(search) !== -1) {
                $(el).removeClass('hidden');
            } else {
                $(el).addClass('hidden');
            }
        });
    },
    
    toggleData: function(e) {
        $(this).toggleClass('active exposed');
        
        if (!$('div.data', this).hasClass('loaded')) {
            $(this).addClass('loading');
            e.data.self.loadAlbumsInfo(this);
        }
    },
    
    loadAlbumsInfo: function(el) {
        var uid = $(el).attr('uid');
        var _this = this;
        
        VK.Api.call('photos.getAlbums', {uid: uid}, function(r) {
            if (r.response) {
                var l = 0;
                for (var i in r.response) {
                    var album = _this.params.albumInfoRow.clone(true);
                    album.text(r.response[i].title);
                    album.appendTo($('.data', el));
                    
                    if (typeof _this.params.friends[uid].albums == 'undefined') {
                        _this.params.friends[uid].albums = [];
                    }
                    _this.params.friends[uid].albums.push(r.response[i]);
                    l++;
                }
                
                $(el).removeClass('loading');
                $('.data', el).addClass('loaded');
                $('.data img', el).remove();
                
                if (l) {
                    var button = $('<button>Скачать</button>');
                    button.bind('click', {self: _this}, _this.download).prependTo($('.data', el));
                } else {
                    $('.data', el).html('Нет альбомов');
                }
            }
        });
    },
    
    download: function(e) {
        var _this = e.data.self;
        var uid = $(this).parent().parent().attr('uid');
        var albums = _this.params.friends[uid].albums;
        if (typeof _this.params.friends[uid].photos == 'undefined') {
            _this.params.friends[uid].photos = {};
        }
        var photos = _this.params.friends[uid].photos;
        
        if (!$('.loader', this).length) {
            var loader = $('<div class="loader" />');
            $(this).parent().parent().toggleClass('active exposed').prepend(loader);
        } else {
            var loader = $('.loader', this).show();
        }
        
        var getFuncs = [];
        for (var i in albums) {
            var aid = albums[i].aid;
            var title = albums[i].title;
            photos[aid] = [];
            
            getFuncs.push(
                async.apply(function(_this, uid, aid, title, loader, callback) {
                    var delay = _this.params.currentDownloads * 200;
                    _this.params.currentDownloads++;
                    
                    setTimeout(function() {
                        loader.html('<span>Загрузка альбома «' + title + '»</span>');
                        VK.Api.call('photos.get', {uid: uid, aid: aid}, function(r) {
                            if (r.response) {
                                for (var i in r.response) {
                                    photos[aid].push(r.response[i]);
                                }
                                callback(null, null);
                            }
                            _this.params.currentDownloads--;
                        });
                    }, delay);
                }, _this, uid, aid, title, loader)
            );
        }
        async.series(getFuncs, function(err, result) {
            loader.html('<span>Передача данных на сервер и ожидание ответа</span>');
            _this.sendPhotosToServer(uid, loader);
        });
    },
    
    sendPhotosToServer: function(uid, loader) {
        $.ajax({
            url: 'ajax',
            type: 'POST',
            data: {
                action: 'downloadPhotos',
                data: JSON.stringify({
                    albums: this.params.friends[uid].albums,
                    photos: this.params.friends[uid].photos
                })
            },
            dataType: 'json',
            success: function(r) {
                if (r.url) {
                    window.location = r.url;
                    loader.html('<a href="' + r.url + '">' + r.url + '</a>');
                }
            },
            error: function(jqXHR, textStatus) {
                loader.text = textStatus;
            }
        });
    }
}