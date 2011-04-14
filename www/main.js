VK.init({
    apiId: 2254160
});
VK.Auth.login(function(response) {
    if (response.session) {
        VKPhotos.init();
    } else {
        /* Пользователь нажал кнопку Отмена в окне авторизации */
    }
}, 2);

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