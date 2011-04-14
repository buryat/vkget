/**
 * User: sedictor
 * Date: 3/30/11
 * Time: 8:45 AM
 * File: main.js
 */
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
        for (var i in this.sections) {
            if (typeof this.sections[i].init == 'function') {
                this.sections[i].init();
            }
        }
    },
    
    sections: {}
}
var globalObj = VKPhotos;

require(['sections/friends', 'sections/favorites']);