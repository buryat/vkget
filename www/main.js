VK.init({
    apiId: 2254160
});

var VKPhotos = {
    init: function() {
        this.sections.friends.init();
        this.sections.favorites.init();
    },
    
    sections: {}
}
var globalObj = VKPhotos;

require(['js/jquery.example.js']);
require(['sections/friends', 'sections/favorites']);

$(document).ready(function() {
    VK.Api.call('isAppUser', {}, function(r) {
        if (r.response) {
            VK.Api.call('getUserSettings', {}, function(r) {
                if (r.response) {
                    VK.Api.call('getProfiles', {uids: VK._session.mid}, function(r) {
                        if (r.response[0]) {
                            VK._session.user = r.response[0];
                            VK._session.user.id = VK._session.user.uid;
                            $('#vk_auth').remove();
                            VKPhotos.init();
                        }
                    });
                }
            });
        }
    });
});

function doLogin() {
    VK.Auth.login(function(response) {
        if (response.session) {
            $('#vk_auth').remove();
            VKPhotos.init();
        } else {
            alert('Для работы сайта необходимо ваше разрешение')
        }
    }, 2);
    return false;
}