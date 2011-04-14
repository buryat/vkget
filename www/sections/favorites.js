globalObj.sections.favorites = {
    params: {
        sectionContainer: null,
        favoritesContainer: null,
        favoriteRow: null,
        albumInfoRow: null,
        favorites: {},
        currentDownloads: 0
    },
    
    init: function() {
        this.params.sectionContainer = $('<div class="favorites"><h2>Поиск людей</h2></div>');
        var search = $('<input type="search" size="30" />').example('http://vkontakte.ru/id1');
        search.appendTo(this.params.sectionContainer);
        search.bind('keydown', {self: this}, this.search);
        
        this.params.favoritesContainer = $('<div />');
        this.params.favoritesContainer.appendTo(this.params.sectionContainer);
        
        this.params.favoriteRow = $('<div class="user"><div class="small img" /><h3 class="name"></h3><h4 class="nickname"></h4><h5 class="domain"></h5><div class="data"><img src="loading.gif" /></div></div>');
        this.params.favoriteRow.bind('click', {self: this}, this.toggleData);
        
        this.params.albumInfoRow = $('<div></div>');
        
        this.getFavorites(VK._session.user.id);
        
        $('div.sections').append(this.params.sectionContainer);
    },
    
    reset: function() {
        this.params.favoritesContainer.empty();
    },
    
    setData: function(dataArray) {
        this.reset();
        
        var uids = [];
        for (var i in dataArray) {
            uids.push(dataArray[i][0]);
        }
        uids = uids.join(',');
        
        VK.Api.call('getProfiles',
            {
                uids: uids,
                fields: ['uid', 'first_name', 'last_name', 'nickname', 'photo', 'photo_big', 'domain']
            },
            async.apply(function(_this, r) {
                if (r.response) {
                    if (r.response.length) {
                        _this.add(undefined, r.response[0]);
                        _this.params.favorites[r.response[0].uid] = r.response[0];
                    }
                }
            }, this)
        );
    },
    
    search: function(e) {
        var el = $(this);
        el.removeClass('error');
        
        if (e.keyCode == 13) {// Enter
            var _this = e.data.self;
            var els = $(_this.params.favoritesContainer).children();
            var text = this.value, id;
            
            if (text.match(/^(?:http:\/\/)?vkontakte\.ru\/id([0-9]+)$/)) {
                id = text.replace(/^(?:http:\/\/)?vkontakte\.ru\/id([0-9]+)$/, '$1');
            } else if (text.match(/^(?:http:\/\/)?vkontakte\.ru\/(.+)$/)) {
                id = text.replace(/^(?:http:\/\/)?vkontakte\.ru\/(.+)$/, '$1')
            }
            if (!id) {
                return el.addClass('error');
            }
            
            el.addClass('loading');
            VK.Api.call('getProfiles',
                {
                    uids: id,
                    domains: id,
                    fields: ['uid', 'first_name', 'last_name', 'nickname', 'photo', 'photo_big', 'domain']
                },
                async.apply(function(_this, r) {
                    el.removeClass('loading');
                    if (r.response) {
                        if (!r.response[0]) {
                            el.addClass('error');
                        } else {
                            _this.add(undefined, r.response[0]);
                            _this.params.favorites[r.response[0].uid] = r.response[0];
                            _this.saveFavorite(undefined, r.response[0]);
                        }
                    }
                }, _this)
            );
        }
    },
    
    add: function(e, userObj) {
        if (typeof e != 'undefined') {
            var _this = e.data.self;
        } else {
            var _this = this;
        }
        
        var el = _this.params.favoriteRow.clone(true);
        
        $(el).attr('uid', userObj.uid);
        $('.name', el).text(userObj.first_name + ' ' + userObj.last_name);
        $('.nickname', el).text(userObj.nickname);
        $('.domain', el).text(userObj.domain);
        $('.domain', el).text(userObj.domain);
        $('.small', el).css('background', 'url(' + userObj.photo + ')');
        
        el.appendTo(_this.params.favoritesContainer);
    },
    
    getFavorites: function(user_id) {
        $.ajax({
            url: 'ajax',
            type: 'POST',
            data: {
                action: 'getFavorites',
                data: JSON.stringify({
                    user_id: VK._session.user.id
                })
            },
            dataType: 'json',
            success: async.apply(
                function(_this, r) {
                    if (r.response) {
                        _this.setData(r.response);
                    }
                },
                this
            )
        });
    },
    
    saveFavorite: function(e, userObj) {
        $.ajax({
            url: 'ajax',
            type: 'POST',
            data: {
                action: 'saveFavorite',
                data: JSON.stringify({
                    user_id: VK._session.user.id,
                    uid: userObj.uid
                })
            },
            dataType: 'json',
            success: function(r) {
                if (r.response) {
                }
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
                    
                    if (typeof _this.params.favorites[uid].albums == 'undefined') {
                        _this.params.favorites[uid].albums = [];
                    }
                    _this.params.favorites[uid].albums.push(r.response[i]);
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
        var albums = _this.params.favorites[uid].albums;
        if (typeof _this.params.favorites[uid].photos == 'undefined') {
            _this.params.favorites[uid].photos = {};
        }
        var photos = _this.params.favorites[uid].photos;
        
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
                    albums: this.params.favorites[uid].albums,
                    photos: this.params.favorites[uid].photos
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