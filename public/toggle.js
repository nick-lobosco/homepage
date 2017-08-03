var toggles = document.getElementsByClassName('toggle');
for(var i = 0; i < toggles.length; i++){
    toggles[i].addEventListener('click', function(){
        var el = this.nextElementSibling;
        el.style.display = (el.style.display == 'block' ? 'none' : 'block');
    });
 }