<?php
class Ajax {
    public function downloadPhotos($d) {
        $photos = $d['photos'];
        $albums = $d['albums'];
        var_dump($albums);
        var_dump($photos);
    }
}
if (!isset($_REQUEST['action'])) {
    die('No action');
}
$action = $_REQUEST['action'];
unset($_REQUEST['action']);

ob_start();
$ajax = new Ajax;
$response = $ajax->$action($_REQUEST);
$errors = ob_get_clean();

if ($errors) {
    echo $errors;
} else {
    echo $response;
}