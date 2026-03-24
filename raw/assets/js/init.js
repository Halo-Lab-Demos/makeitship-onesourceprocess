function init_gdrp(url) {
    var script = document.createElement('script');
    script.onload = function () {
        console.log(url)
    };
    script.src = url;
    document.head.appendChild(script);
}

function init_gdrp_css(url) {
    var script = document.createElement('link');
    script.onload = function () {
        console.log(url)
    };
    script.rel = 'stylesheet';
    script.href = url;
    document.head.appendChild(script);
}

setTimeout(() => {
    init_gdrp_css('/wp-content/plugins/wc_gdrp/assets/cookieconsent.css')
    init_gdrp('/wp-content/plugins/wc_gdrp/assets/cookieconsent.js')
}, 5000)

