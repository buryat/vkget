$.fn.example = function(value) {
    this.unbind('example focus')
        .unbind('example blur')
        .bind('example focus', function() {
            if ($(this).hasClass('example')) {
                $(this).removeClass('example');
                $(this).val('');
            }
        })
        .bind('example blur', function() {
            if (!$(this).val()) {
                $(this).addClass('example');
                $(this).val(value);
            }
        });
    if (!this.val()) {
        this.val(value).addClass('example');
    }
    return this;
}