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
                if (r.response & 2) {
                    VK.Api.call('getProfiles', {uids: VK._session.mid}, function(r) {
                        if (r.response[0]) {
                            VK._session.user = r.response[0];
                            $('#vk_auth').remove();
                            VKPhotos.init();
                        }
                    });
                } else {
                    $('#vk_auth').bind('click', function() {
                        VK.Auth.login(function(response) {
                            $('#vk_auth').remove();
                            if (response.session) {
                                VK._session.user.id = VK._session.user.uid
                                VKPhotos.init();
                            } else {
                            }
                        }, 2);
                    });
                }
            });
        }
    });
});