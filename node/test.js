/**
 * @author vadims@adotube.com
 * @date 8/9/11
 * @time 3:19 AM
 * @description
 */
var crypto = require('crypto');
var uri = '/29390383.zip';
var expire = Math.round((new Date()).getTime() / 1000) + 86400*30;
var secret = crypto.createHash('md5').update('vkget_' + uri + expire).digest('base64');
secret = secret.replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
var uri = uri + '?st=' + secret + '&e=' + expire;
console.log(uri);
